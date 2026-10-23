"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Field, inputClass, PrimaryButton } from "@/components/ui";

// Posts to /api/auth/login (same endpoint students use) — the server checks
// the account's role and every admin API route re-checks it again, so this
// page itself is just a UI convenience, not a security boundary.

export default function AdminLoginPage() {
  const router = useRouter();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
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
        body: JSON.stringify({ username, password, rememberMe: false }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "Could not sign in.");
        return;
      }
      if (data.user.role !== "ADMIN" && data.user.role !== "SUPER_ADMIN") {
        // Don't leave a student session behind on the admin login page.
        await fetch("/api/auth/logout", { method: "POST" });
        setError("This account does not have administrator access.");
        return;
      }
      if (data.user.mustChangePassword) {
        router.push("/settings/change-password?forced=1");
        return;
      }
      router.push("/admin");
      router.refresh();
    } catch {
      setError("Could not reach the server. Check your connection and try again.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-ink-950 px-6">
      <div className="w-full max-w-sm rounded-xl border border-plum-800 bg-ink-900 p-8">
        <p className="font-display text-lg font-semibold text-plum-200">
          NAPS E-Learning
        </p>
        <h1 className="mt-1 font-display text-xl font-semibold text-white">
          Administrator sign-in
        </h1>
        <p className="mt-1 text-xs text-plum-300/70">
          Restricted access. All sign-ins are logged.
        </p>

        <form onSubmit={handleSubmit} className="mt-6 space-y-4">
          <Field label="Username">
            <input
              required
              className={`${inputClass} bg-ink-950 text-white`}
              value={username}
              onChange={(e) => setUsername(e.target.value)}
            />
          </Field>
          <Field label="Password">
            <input
              required
              type="password"
              className={`${inputClass} bg-ink-950 text-white`}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
          </Field>
          <PrimaryButton type="submit" className="w-full" disabled={submitting}>
            {submitting ? "Signing in..." : "Sign in"}
          </PrimaryButton>
          {error && (
            <p className="rounded-lg bg-red-500/10 px-3 py-2 text-sm text-red-300">
              {error}
            </p>
          )}
        </form>
      </div>
    </div>
  );
}
