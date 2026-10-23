import { NextRequest, NextResponse } from "next/server";
import crypto from "crypto";
import { prisma } from "@/lib/prisma";
import { hashOtp, OTP_MAX_ATTEMPTS } from "@/lib/otp";
import { verifySchema } from "@/lib/validation";
import { checkRateLimit, getClientIp } from "@/lib/rate-limit";

export async function POST(req: NextRequest) {
  const rl = await checkRateLimit(`verify:${getClientIp(req)}`, 20, 60 * 15);
  if (!rl.allowed) {
    return NextResponse.json({ error: "Too many attempts. Try again later." }, { status: 429 });
  }

  const parsed = verifySchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: "Enter the 6-digit code." }, { status: 400 });
  }
  const { userId, code } = parsed.data;

  const record = await prisma.emailVerificationCode.findFirst({
    where: { userId, usedAt: null },
    orderBy: { createdAt: "desc" },
  });

  if (!record) {
    return NextResponse.json(
      { error: "No pending verification for this account. Request a new code." },
      { status: 400 }
    );
  }

  if (record.expiresAt < new Date()) {
    return NextResponse.json(
      { error: "This code has expired. Request a new one." },
      { status: 400 }
    );
  }

  if (record.attempts >= OTP_MAX_ATTEMPTS) {
    return NextResponse.json(
      { error: "Too many incorrect attempts. Request a new code." },
      { status: 400 }
    );
  }

  const candidateHash = hashOtp(code, userId);
  const expected = Buffer.from(record.codeHash);
  const candidate = Buffer.from(candidateHash);
  const matches =
    expected.length === candidate.length && crypto.timingSafeEqual(expected, candidate);

  if (!matches) {
    await prisma.emailVerificationCode.update({
      where: { id: record.id },
      data: { attempts: { increment: 1 } },
    });
    return NextResponse.json({ error: "Incorrect code." }, { status: 400 });
  }

  await prisma.$transaction([
    prisma.emailVerificationCode.update({
      where: { id: record.id },
      data: { usedAt: new Date() },
    }),
    prisma.user.update({
      where: { id: userId },
      data: { isEmailVerified: true },
    }),
  ]);

  return NextResponse.json({ success: true });
}
