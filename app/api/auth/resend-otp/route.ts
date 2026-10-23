import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { generateOtp, hashOtp, otpExpiryDate, OTP_RESEND_COOLDOWN_SECONDS } from "@/lib/otp";
import { sendOtpEmail } from "@/lib/email";
import { resendSchema } from "@/lib/validation";
import { checkRateLimit, getClientIp } from "@/lib/rate-limit";

export async function POST(req: NextRequest) {
  const parsed = resendSchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid request." }, { status: 400 });
  }
  const { userId } = parsed.data;

  const rl = await checkRateLimit(`resend:${userId}`, 5, 60 * 15);
  const rlIp = await checkRateLimit(`resend-ip:${getClientIp(req)}`, 10, 60 * 15);
  if (!rl.allowed || !rlIp.allowed) {
    return NextResponse.json({ error: "Too many resend requests. Try again later." }, { status: 429 });
  }

  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user || user.isEmailVerified) {
    // Don't reveal account existence/state beyond what's necessary.
    return NextResponse.json({ success: true });
  }

  const last = await prisma.emailVerificationCode.findFirst({
    where: { userId },
    orderBy: { createdAt: "desc" },
  });
  if (last) {
    const secondsSince = (Date.now() - last.createdAt.getTime()) / 1000;
    if (secondsSince < OTP_RESEND_COOLDOWN_SECONDS) {
      return NextResponse.json(
        { error: `Please wait ${Math.ceil(OTP_RESEND_COOLDOWN_SECONDS - secondsSince)}s before requesting another code.` },
        { status: 429 }
      );
    }
    // Invalidate any prior unused code before issuing a new one.
    if (!last.usedAt) {
      await prisma.emailVerificationCode.update({
        where: { id: last.id },
        data: { usedAt: new Date() },
      });
    }
  }

  const code = generateOtp();
  await prisma.emailVerificationCode.create({
    data: { userId, codeHash: hashOtp(code, userId), expiresAt: otpExpiryDate() },
  });

  try {
    await sendOtpEmail(user.personalEmail, code, user.fullName);
  } catch (err) {
    console.error("Failed to send OTP email:", err);
    return NextResponse.json(
      { error: "We couldn't send the email right now. Please try again shortly." },
      { status: 502 }
    );
  }

  return NextResponse.json({ success: true });
}
