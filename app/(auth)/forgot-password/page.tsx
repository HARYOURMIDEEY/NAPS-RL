"use client";

import { useState } from "react";
import Link from "next/link";
import { Field, inputClass, PrimaryButton } from "@/components/ui";

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [sent, setSent] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      const res = await fetch("/api/auth/forgot-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });
      // This endpoint always returns success, by design — it never reveals
      // whether an account exists for the given email.
      if (res.ok) setSent(true);
      else setError("Something went wrong. Try again.");
    } catch {
      setError("Could not reach the server. Check your connection and try again.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="mx-auto flex min-h-screen max-w-md flex-col justify-center px-6 py-12">
      <p className="font-display text-lg font-semibold text-plum-600">
        NAPS E-Learning
      </p>
      <h1 className="mt-2 font-display text-2xl font-semibold text-ink-950">
        Reset your password
      </h1>

      {sent ? (
        <p className="mt-4 rounded-lg bg-plum-50 px-3.5 py-3 text-sm text-plum-700">
          If an account exists for that email, a reset link is on its way.
          Check your inbox — the link expires in 30 minutes.
        </p>
      ) : (
        <form onSubmit={handleSubmit} className="mt-6 space-y-4">
          <Field label="Registered email">
            <input
              required
              type="email"
              className={inputClass}
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="Personal or student email"
            />
          </Field>
          {error && (
            <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-600">
              {error}
            </p>
          )}
          <PrimaryButton type="submit" className="w-full" disabled={submitting}>
            {submitting ? "Sending..." : "Send reset link"}
          </PrimaryButton>
        </form>
      )}

      <p className="mt-5 text-center text-sm text-plum-700/70">
        <Link href="/login" className="font-medium text-plum-600">
          Back to login
        </Link>
      </p>
    </div>
  );
}
