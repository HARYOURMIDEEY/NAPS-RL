"use client";

import { Suspense, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Card, Field, inputClass, PrimaryButton } from "@/components/ui";

function ChangePasswordForm() {
  const router = useRouter();
  const params = useSearchParams();
  const forced = params.get("forced") === "1";
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmNewPassword, setConfirmNewPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      const res = await fetch("/api/auth/change-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ currentPassword, newPassword, confirmNewPassword }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "Could not change password.");
        return;
      }
      router.push(data.role === "STUDENT" ? "/dashboard" : "/admin");
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
        Change your password
      </h1>
      {forced && (
        <p className="mt-2 text-sm text-plum-700/70">
          For security, you need to set a new password before continuing.
        </p>
      )}

      <Card className="mt-6">
        <form onSubmit={handleSubmit} className="space-y-4">
          <Field label="Current password">
            <input
              required
              type="password"
              className={inputClass}
              autoComplete="current-password"
              value={currentPassword}
              onChange={(e) => setCurrentPassword(e.target.value)}
            />
          </Field>
          <Field label="New password">
            <input
              required
              type="password"
              className={inputClass}
              autoComplete="new-password"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              placeholder="At least 8 characters, letters and numbers"
            />
          </Field>
          <Field label="Confirm new password">
            <input
              required
              type="password"
              className={inputClass}
              autoComplete="new-password"
              value={confirmNewPassword}
              onChange={(e) => setConfirmNewPassword(e.target.value)}
            />
          </Field>
          {error && (
            <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-600">
              {error}
            </p>
          )}
          <PrimaryButton type="submit" className="w-full" disabled={submitting}>
            {submitting ? "Updating..." : "Update password"}
          </PrimaryButton>
        </form>
      </Card>
      <p className="mt-4 text-xs text-plum-700/60">
        Changing your password signs out any other device you are logged in on.
      </p>
    </div>
  );
}

export default function ChangePasswordPage() {
  return (
    <Suspense>
      <ChangePasswordForm />
    </Suspense>
  );
}
