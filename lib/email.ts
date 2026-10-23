import nodemailer from "nodemailer";
import type { Transporter } from "nodemailer";

let cached: Transporter | null = null;

function getTransport(): Transporter {
  if (cached) return cached;
  const url = process.env.EMAIL_SERVER;
  if (!url) {
    throw new Error(
      "EMAIL_SERVER is not set. Add an SMTP connection string (Resend, Brevo, Postmark, SendGrid...) to your environment variables."
    );
  }
  cached = nodemailer.createTransport(url, {
    // Fail fast instead of hanging a serverless function.
    connectionTimeout: 8000,
    greetingTimeout: 8000,
    socketTimeout: 12000,
  });
  return cached;
}

function getFrom(): string {
  return process.env.EMAIL_FROM ?? "NAPS E-Learning <no-reply@naps-elearning.com>";
}

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function wrap(bodyHtml: string): string {
  return `<!doctype html><html><body style="margin:0;background:#FAF8FB;padding:24px;font-family:Arial,Helvetica,sans-serif;color:#1B1023;">
<table role="presentation" width="100%" cellspacing="0" cellpadding="0"><tr><td align="center">
<table role="presentation" width="480" cellspacing="0" cellpadding="0" style="max-width:480px;background:#ffffff;border:1px solid #EBE0F5;border-radius:12px;">
<tr><td style="background:#5C2D82;color:#ffffff;padding:18px 24px;border-radius:12px 12px 0 0;font-size:16px;font-weight:700;">NAPS E-Learning &middot; FUTMinna Physics</td></tr>
<tr><td style="padding:24px;font-size:15px;line-height:1.55;">${bodyHtml}</td></tr>
<tr><td style="padding:14px 24px;font-size:12px;color:#7a6a88;border-top:1px solid #EBE0F5;">If you did not expect this email, you can safely ignore it.</td></tr>
</table></td></tr></table></body></html>`;
}

export async function sendOtpEmail(to: string, code: string, fullName: string) {
  await getTransport().sendMail({
    from: getFrom(),
    to,
    subject: "Verify your NAPS E-Learning account",
    text: `Hi ${fullName},\n\nYour verification code is ${code}. It expires in 10 minutes.\n\nIf you didn't request this, you can ignore this email.`,
    html: wrap(
      `<p>Hi ${escapeHtml(fullName)},</p><p>Your verification code is:</p><p style="font-size:30px;font-weight:700;letter-spacing:6px;color:#5C2D82;margin:12px 0;">${escapeHtml(code)}</p><p>This code expires in 10 minutes.</p>`
    ),
  });
}

export async function sendPasswordResetEmail(
  to: string,
  resetUrl: string,
  fullName: string
) {
  await getTransport().sendMail({
    from: getFrom(),
    to,
    subject: "Reset your NAPS E-Learning password",
    text: `Hi ${fullName},\n\nReset your password here: ${resetUrl}\n\nThis link expires in 30 minutes. If you didn't request this, you can ignore this email.`,
    html: wrap(
      `<p>Hi ${escapeHtml(fullName)},</p><p>We received a request to reset your password.</p><p><a href="${escapeHtml(resetUrl)}" style="display:inline-block;background:#5C2D82;color:#ffffff;text-decoration:none;padding:10px 18px;border-radius:8px;font-weight:600;">Reset password</a></p><p style="font-size:13px;color:#5b4a6b;">This link expires in 30 minutes.</p>`
    ),
  });
}

export async function sendPasswordChangedNotice(to: string, fullName: string) {
  await getTransport().sendMail({
    from: getFrom(),
    to,
    subject: "Your NAPS E-Learning password was changed",
    text: `Hi ${fullName},\n\nYour password was just changed. If this wasn't you, reset your password immediately and contact NAPS support.`,
    html: wrap(
      `<p>Hi ${escapeHtml(fullName)},</p><p>Your password was just changed. If this wasn't you, reset your password immediately and contact NAPS support.</p>`
    ),
  });
}
