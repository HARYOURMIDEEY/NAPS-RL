import crypto from "crypto";

export const OTP_LENGTH = 6;
export const OTP_TTL_MINUTES = 10;
export const OTP_MAX_ATTEMPTS = 5;
export const OTP_RESEND_COOLDOWN_SECONDS = 60;

function getHashSecret(): string {
  const secret = process.env.AUTH_SECRET;
  if (!secret || secret.length < 16) {
    throw new Error("AUTH_SECRET is missing or too short.");
  }
  return secret;
}

/** Cryptographically-random 6-digit code, as a string (keeps leading zeros). */
export function generateOtp(): string {
  const max = 10 ** OTP_LENGTH;
  const n = crypto.randomInt(0, max);
  return n.toString().padStart(OTP_LENGTH, "0");
}

/** OTPs are short-lived, so a keyed HMAC-SHA256 is appropriate here (unlike
 * passwords, which use bcrypt). */
export function hashOtp(code: string, userId: string): string {
  return crypto
    .createHmac("sha256", getHashSecret())
    .update(`${userId}:${code}`)
    .digest("hex");
}

export function otpExpiryDate(): Date {
  return new Date(Date.now() + OTP_TTL_MINUTES * 60 * 1000);
}

/** Generates a cryptographically secure random token for password resets. */
export function generateResetToken(): string {
  return crypto.randomBytes(32).toString("hex");
}

export function hashResetToken(token: string): string {
  return crypto.createHash("sha256").update(token).digest("hex");
}
