import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession, createSessionToken, setSessionCookie } from "@/lib/session";
import { hashPassword, verifyPassword } from "@/lib/password";
import { changePasswordSchema } from "@/lib/validation";
import { sendPasswordChangedNotice } from "@/lib/email";
import { writeAuditLog } from "@/lib/audit";

export async function POST(req: NextRequest) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "Not signed in." }, { status: 401 });
  }

  const parsed = changePasswordSchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? "Invalid input." },
      { status: 400 }
    );
  }
  const { currentPassword, newPassword } = parsed.data;

  const user = await prisma.user.findUnique({ where: { id: session.sub } });
  if (!user) return NextResponse.json({ error: "Account not found." }, { status: 404 });

  const currentOk = await verifyPassword(currentPassword, user.passwordHash);
  if (!currentOk) {
    return NextResponse.json({ error: "Current password is incorrect." }, { status: 400 });
  }

  const newHash = await hashPassword(newPassword);
  const updated = await prisma.user.update({
    where: { id: user.id },
    data: {
      passwordHash: newHash,
      mustChangePassword: false,
      sessionVersion: { increment: 1 }, // invalidates any other existing session tokens
    },
  });

  // Re-issue a fresh session token for *this* browser under the new version.
  const token = await createSessionToken(
    {
      sub: updated.id,
      username: updated.username,
      role: updated.role,
      fullName: updated.fullName,
      level: updated.level,
      sessionVersion: updated.sessionVersion,
    },
    true
  );
  await setSessionCookie(token, true);

  try {
    await sendPasswordChangedNotice(updated.personalEmail, updated.fullName);
  } catch (err) {
    console.error("Failed to send password-changed notice:", err);
  }

  await writeAuditLog({
    actorId: updated.id,
    action: "PASSWORD_CHANGED",
    resource: `user:${updated.username}`,
    status: "SUCCESS",
  });

  return NextResponse.json({ success: true, role: updated.role });
}
