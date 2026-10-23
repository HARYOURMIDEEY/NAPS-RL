"use client";

import { Suspense, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { Notice, PrimaryButton, SecondaryButton } from "@/components/ui";
import { postJson } from "@/lib/api-client";

// "Verify" posts the code to /api/auth/verify, which checks it server-side
// against a hashed, expiring code with a max-attempts limit. "Resend" calls
// /api/auth/resend-otp, which enforces a cooldown.

function VerifyForm() {
  const router = useRouter();
  const params = useSearchParams();
  const email = params.get("email") ?? "your personal email";
  const userId = params.get("userId") ?? "";
  const sendFailed = params.get("sendFailed") === "1";
  const [code, setCode] = useState(["", "", "", "", "", ""]);
  const [resent, setResent] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const inputs = useRef<(HTMLInputElement | null)[]>([]);

  function updateDigit(index: number, value: string) {
    if (!/^[0-9]?$/.test(value)) return;
    const next = [...code];
    next[index] = value;
    setCode(next);
    if (value && index < 5) inputs.current[index + 1]?.focus();
  }

  function handleKeyDown(index: number, e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === "Backspace" && !code[index] && index > 0) inputs.current[index - 1]?.focus();
  }

  function handlePaste(e: React.ClipboardEvent<HTMLInputElement>) {
    const digits = e.clipboardData.getData("text").replace(/\D/g, "").slice(0, 6);
    if (digits.length === 0) return;
    e.preventDefault();
    const next = ["", "", "", "", "", ""];
    digits.split("").forEach((d, i) => (next[i] = d));
    setCode(next);
    inputs.current[Math.min(digits.length, 5)]?.focus();
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      await postJson("/api/auth/verify", { userId, code: code.join("") });
      router.push("/login?verified=1");
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setSubmitting(false);
    }
  }

  async function handleResend() {
    setError(null);
    setResent(false);
    try {
      await postJson("/api/auth/resend-otp", { userId });
      setResent(true);
    } catch (err) {
      setError((err as Error).message);
    }
  }

  if (!userId) {
    return (
      <div className="mx-auto flex min-h-screen max-w-md flex-col justify-center px-6 py-12">
        <h1 className="font-display text-2xl font-semibold text-ink-950">Verification link incomplete</h1>
        <p className="mt-2 text-sm text-plum-700/70">
          We couldn&apos;t tell which account to verify. Log in and we&apos;ll bring you back here, or create an
          account if you haven&apos;t yet.
        </p>
        <div className="mt-5 flex gap-3">
          <Link href="/login" className="rounded-lg bg-plum-500 px-4 py-2.5 text-sm font-medium text-white hover:bg-plum-600">
            Log in
          </Link>
          <Link href="/register" className="rounded-lg border border-plum-200 px-4 py-2.5 text-sm font-medium text-plum-700 hover:bg-plum-50">
            Create account
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto flex min-h-screen max-w-md flex-col justify-center px-6 py-12">
      <p className="font-display text-lg font-semibold text-plum-600">NAPS E-Learning</p>
      <h1 className="mt-2 font-display text-2xl font-semibold text-ink-950">Verify your email</h1>
      <p className="mt-1 text-sm text-plum-700/70">
        Step 2 of 3 &mdash; Enter the 6-digit code sent to {email}
      </p>

      {sendFailed && (
        <div className="mt-4">
          <Notice tone="error">
            We couldn&apos;t send the code automatically. Tap &quot;Resend code&quot; below to try again.
          </Notice>
        </div>
      )}

      <form onSubmit={handleSubmit} className="mt-6 space-y-6">
        <div className="flex justify-between gap-2">
          {code.map((digit, i) => (
            <input
              key={i}
              ref={(el) => {
                inputs.current[i] = el;
              }}
              inputMode="numeric"
              autoComplete={i === 0 ? "one-time-code" : "off"}
              maxLength={1}
              value={digit}
              aria-label={`Digit ${i + 1}`}
              onChange={(e) => updateDigit(i, e.target.value)}
              onKeyDown={(e) => handleKeyDown(i, e)}
              onPaste={handlePaste}
              className="h-14 w-12 rounded-lg border border-plum-200 text-center text-xl font-semibold text-ink-950 focus:border-plum-400 focus:outline-none"
            />
          ))}
        </div>

        <p className="text-xs text-plum-700/60">
          This code expires in 10 minutes. After a few wrong attempts you&apos;ll need to request a new one.
        </p>

        {error && <Notice tone="error">{error}</Notice>}

        <PrimaryButton type="submit" className="w-full" disabled={code.some((d) => d === "") || submitting}>
          {submitting ? "Verifying..." : "Verify account"}
        </PrimaryButton>

        <SecondaryButton type="button" className="w-full" onClick={handleResend}>
          Resend code
        </SecondaryButton>
        {resent && <p className="text-center text-sm text-plum-600">A new code has been sent to {email}.</p>}
      </form>
    </div>
  );
}

export default function VerifyPage() {
  return (
    <Suspense>
      <VerifyForm />
    </Suspense>
  );
}
