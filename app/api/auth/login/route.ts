import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { verifyPassword } from "@/lib/password";
import { createSessionToken, setSessionCookie } from "@/lib/session";
import { loginSchema } from "@/lib/validation";
import { checkRateLimit, getClientIp } from "@/lib/rate-limit";
import { writeAuditLog } from "@/lib/audit";

const MAX_FAILED_ATTEMPTS = 5;
const LOCKOUT_MINUTES = 15;

// Used so a login for a non-existent username costs the same time as a real
// one (prevents username enumeration by response timing).
const DUMMY_HASH = "$2a$12$C6UzMDM.H6dfI/f/IKcEeO5l6e5T5l0yX9m3nQ0o8m6l5l2w1y3Gy";

export async function POST(req: NextRequest) {
  const rl = await checkRateLimit(`login:${getClientIp(req)}`, 15, 60 * 15);
  if (!rl.allowed) {
    return NextResponse.json({ error: "Too many login attempts. Try again later." }, { status: 429 });
  }

  const parsed = loginSchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: "Enter your username and password." }, { status: 400 });
  }
  const { username, password, rememberMe } = parsed.data;

  const user = await prisma.user.findUnique({ where: { username } });

  const genericError = () =>
    NextResponse.json({ error: "Incorrect username or password." }, { status: 401 });

  if (!user) {
    await verifyPassword(password, DUMMY_HASH).catch(() => false);
    return genericError();
  }

  if (user.lockedUntil && user.lockedUntil > new Date()) {
    const minutesLeft = Math.ceil((user.lockedUntil.getTime() - Date.now()) / 60000);
    return NextResponse.json(
      { error: `Account temporarily locked after repeated failed attempts. Try again in ${minutesLeft} minute(s).` },
      { status: 423 }
    );
  }

  const passwordOk = await verifyPassword(password, user.passwordHash);
  if (!passwordOk) {
    const attempts = user.failedLoginAttempts + 1;
    const shouldLock = attempts >= MAX_FAILED_ATTEMPTS;
    await prisma.user.update({
      where: { id: user.id },
      data: {
        failedLoginAttempts: shouldLock ? 0 : attempts,
        lockedUntil: shouldLock ? new Date(Date.now() + LOCKOUT_MINUTES * 60 * 1000) : null,
      },
    });
    await writeAuditLog({
      actorId: user.id,
      action: "LOGIN_FAILED",
      resource: `user:${user.username}`,
      status: "FAILURE",
    });
    return genericError();
  }

  // Account-state checks only run AFTER the password is confirmed, so they
  // can't be used to discover which usernames exist.
  if (!user.isActive) {
    return NextResponse.json({ error: "This account is not active. Contact NAPS support." }, { status: 403 });
  }
  if (user.isSuspended) {
    return NextResponse.json({ error: "This account has been suspended. Contact NAPS support." }, { status: 403 });
  }
  if (user.failedLoginAttempts > 0 || user.lockedUntil) {
    await prisma.user.update({
      where: { id: user.id },
      data: { failedLoginAttempts: 0, lockedUntil: null },
    });
  }

  const token = await createSessionToken(
    {
      sub: user.id,
      username: user.username,
      role: user.role,
      fullName: user.fullName,
      level: user.level,
      sessionVersion: user.sessionVersion,
    },
    rememberMe
  );
  await setSessionCookie(token, rememberMe);

  await writeAuditLog({
    actorId: user.id,
    action: user.role === "STUDENT" ? "STUDENT_LOGIN" : "ADMIN_LOGIN",
    resource: `user:${user.username}`,
    status: "SUCCESS",
  });

  return NextResponse.json({
    user: {
      role: user.role,
      fullName: user.fullName,
      username: user.username,
      mustChangePassword: user.mustChangePassword,
    },
  });
}
