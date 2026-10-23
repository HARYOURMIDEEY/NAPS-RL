"use client";

import { Suspense, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { Field, inputClass, PrimaryButton } from "@/components/ui";

// Posts to /api/auth/login, which checks server-side, in order: username
// exists → not locked out → account active → not suspended → email verified
// → password matches (bcrypt compare) → issues a signed session cookie.

function LoginForm() {
  const router = useRouter();
  const params = useSearchParams();
  const justVerified = params.get("verified") === "1";
  const justReset = params.get("reset") === "1";
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [remember, setRemember] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username, password, rememberMe: remember }),
      });
      const data = await res.json();
      if (!res.ok) {
        if (data.needsVerification) {
          router.push(`/verify?userId=${encodeURIComponent(data.userId)}`);
          return;
        }
        setError(data.error ?? "Login failed.");
        return;
      }
      if (data.user?.mustChangePassword) {
        router.push("/settings/change-password?forced=1");
        return;
      }
      router.push(data.user?.role === "STUDENT" ? "/dashboard" : "/admin");
      router.refresh();
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
        Log in
      </h1>

      {justReset && (
        <p className="mt-3 rounded-lg bg-plum-50 px-3 py-2 text-sm text-plum-700">
          Your password has been reset. Log in with your new password.
        </p>
      )}

      {justVerified && (
        <p className="mt-3 rounded-lg bg-plum-50 px-3 py-2 text-sm text-plum-700">
          Your account has been successfully verified. You can now log in.
        </p>
      )}

      <form onSubmit={handleSubmit} className="mt-6 space-y-4">
        <Field label="Username">
          <input
            required
            autoComplete="username"
            autoCapitalize="none"
            className={inputClass}
            value={username}
            onChange={(e) => setUsername(e.target.value)}
          />
        </Field>
        <Field label="Password">
          <input
            required
            type="password"
            autoComplete="current-password"
            className={inputClass}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />
        </Field>

        <div className="flex items-center justify-between text-sm">
          <label className="flex items-center gap-2 text-plum-700/80">
            <input
              type="checkbox"
              checked={remember}
              onChange={(e) => setRemember(e.target.checked)}
              className="rounded border-plum-300"
            />
            Remember me
          </label>
          <Link href="/forgot-password" className="font-medium text-plum-600">
            Forgot password?
          </Link>
        </div>

        {error && (
          <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-600">
            {error}
          </p>
        )}

        <PrimaryButton type="submit" className="w-full" disabled={submitting}>
          {submitting ? "Logging in..." : "Log in"}
        </PrimaryButton>
      </form>

      <p className="mt-5 text-center text-sm text-plum-700/70">
        New here?{" "}
        <Link href="/register" className="font-medium text-plum-600">
          Create an account
        </Link>
      </p>
      <p className="mt-2 text-center text-xs text-plum-700/50">
        <Link href="/admin/login">Administrator login</Link>
      </p>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense>
      <LoginForm />
    </Suspense>
  );
}
