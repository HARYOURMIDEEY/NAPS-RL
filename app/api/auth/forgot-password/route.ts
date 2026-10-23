import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { generateResetToken, hashResetToken } from "@/lib/otp";
import { sendPasswordResetEmail } from "@/lib/email";
import { forgotPasswordSchema } from "@/lib/validation";
import { checkRateLimit, getClientIp } from "@/lib/rate-limit";
import { getAppUrl } from "@/lib/env";

const RESET_TTL_MINUTES = 30;

export async function POST(req: NextRequest) {
  const rl = await checkRateLimit(`forgot:${getClientIp(req)}`, 5, 60 * 15);
  if (!rl.allowed) {
    return NextResponse.json({ error: "Too many requests. Try again later." }, { status: 429 });
  }

  const parsed = forgotPasswordSchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: "Enter a valid email." }, { status: 400 });
  }
  const { email } = parsed.data;

  const user = await prisma.user.findFirst({
    where: { OR: [{ personalEmail: email }, { studentEmail: email }] },
  });

  // Always return success, whether or not the email matched — this endpoint
  // must never reveal which emails have accounts.
  if (user) {
    const token = generateResetToken();
    await prisma.passwordResetToken.create({
      data: {
        userId: user.id,
        tokenHash: hashResetToken(token),
        expiresAt: new Date(Date.now() + RESET_TTL_MINUTES * 60 * 1000),
      },
    });
    const resetUrl = `${getAppUrl()}/reset-password?token=${token}`;
    try {
      await sendPasswordResetEmail(user.personalEmail, resetUrl, user.fullName);
    } catch (err) {
      console.error("Failed to send password reset email:", err);
    }
  }

  return NextResponse.json({ success: true });
}
