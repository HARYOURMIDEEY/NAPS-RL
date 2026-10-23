"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Field, inputClass, PrimaryButton } from "@/components/ui";

// Calls POST /api/auth/register. Email verification is disabled; successful registration goes directly to login.

const LEVELS = [100, 200, 300, 400, 500];

export default function RegisterPage() {
  const router = useRouter();
  const [form, setForm] = useState({
    fullName: "",
    username: "",
    studentEmail: "",
    personalEmail: "",
    matricNumber: "",
    phoneNumber: "",
    level: 300,
    password: "",
    confirmPassword: "",
  });
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  function update<K extends keyof typeof form>(key: K, value: (typeof form)[K]) {
    setForm((f) => ({ ...f, [key]: value }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (form.password.length < 8 || !/[0-9]/.test(form.password) || !/[a-zA-Z]/.test(form.password)) {
      setError("Password must be at least 8 characters and contain both letters and numbers.");
      return;
    }
    if (form.password !== form.confirmPassword) {
      setError("Passwords do not match.");
      return;
    }
    setError(null);
    setSubmitting(true);
    try {
      const res = await fetch("/api/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "Registration failed.");
        return;
      }
      router.push("/login?registered=1");
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
        Create your student account
      </h1>
      <p className="mt-1 text-sm text-plum-700/70">
        Create your account
      </p>

      <form onSubmit={handleSubmit} className="mt-6 space-y-4">
        <Field label="Full name">
          <input
            required
            className={inputClass}
            value={form.fullName}
            onChange={(e) => update("fullName", e.target.value)}
            placeholder="e.g. Ridwanullahi Muhammed Awwal"
          />
        </Field>

        <Field label="Username">
          <input
            required
            className={inputClass}
            value={form.username}
            onChange={(e) => update("username", e.target.value.trim())}
            placeholder="Unique username for login"
          />
        </Field>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <Field label="FUTMinna student email">
            <input
              required
              type="email"
              className={inputClass}
              value={form.studentEmail}
              onChange={(e) => update("studentEmail", e.target.value)}
              placeholder="you@st.futminna.edu.ng"
            />
          </Field>
          <Field label="Personal email">
            <input
              required
              type="email"
              className={inputClass}
              value={form.personalEmail}
              onChange={(e) => update("personalEmail", e.target.value)}
              placeholder="Your contact email address"
            />
          </Field>
        </div>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <Field label="Matriculation number">
            <input
              required
              className={inputClass}
              value={form.matricNumber}
              onChange={(e) => update("matricNumber", e.target.value)}
              placeholder="As on your student ID"
            />
          </Field>
          <Field label="Phone number">
            <input
              required
              className={inputClass}
              value={form.phoneNumber}
              onChange={(e) => update("phoneNumber", e.target.value)}
              placeholder="080..."
            />
          </Field>
        </div>

        <Field label="Level">
          <select
            className={inputClass}
            value={form.level}
            onChange={(e) => update("level", Number(e.target.value))}
          >
            {LEVELS.map((l) => (
              <option key={l} value={l}>
                {l} Level
              </option>
            ))}
          </select>
        </Field>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <Field label="Password">
            <input
              required
              type="password"
              className={inputClass}
              value={form.password}
              autoComplete="new-password"
              onChange={(e) => update("password", e.target.value)}
              placeholder="8+ characters, letters and numbers"
            />
          </Field>
          <Field label="Confirm password">
            <input
              required
              type="password"
              className={inputClass}
              value={form.confirmPassword}
              autoComplete="new-password"
              onChange={(e) => update("confirmPassword", e.target.value)}
            />
          </Field>
        </div>

        {error && (
          <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-600">
            {error}
          </p>
        )}

        <PrimaryButton type="submit" className="w-full" disabled={submitting}>
          {submitting ? "Creating account..." : "Create account"}
        </PrimaryButton>
      </form>

      <p className="mt-5 text-center text-sm text-plum-700/70">
        Already have an account?{" "}
        <Link href="/login" className="font-medium text-plum-600">
          Log in
        </Link>
      </p>
    </div>
  );
}
