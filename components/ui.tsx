import { ReactNode } from "react";

export function Card({
  children,
  className = "",
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <div
      className={`rounded-xl border border-plum-100 bg-white p-5 shadow-soft ${className}`}
    >
      {children}
    </div>
  );
}

export function StatCard({
  label,
  value,
  hint,
}: {
  label: string;
  value: string;
  hint?: string;
}) {
  return (
    <Card>
      <p className="text-sm text-plum-700/70">{label}</p>
      <p className="mt-1 font-display text-2xl font-semibold text-ink-950">
        {value}
      </p>
      {hint && <p className="mt-1 text-xs text-plum-700/60">{hint}</p>}
    </Card>
  );
}

export function Pill({
  children,
  tone = "default",
}: {
  children: ReactNode;
  tone?: "default" | "gold" | "danger";
}) {
  const tones: Record<string, string> = {
    default: "bg-plum-50 text-plum-700",
    gold: "bg-gold-500/15 text-gold-600",
    danger: "bg-red-50 text-red-600",
  };
  return (
    <span
      className={`inline-flex items-center rounded-full px-2.5 py-1 text-xs font-medium ${tones[tone]}`}
    >
      {children}
    </span>
  );
}

export function PrimaryButton({
  children,
  className = "",
  ...rest
}: React.ButtonHTMLAttributes<HTMLButtonElement>) {
  return (
    <button
      className={`rounded-lg bg-plum-500 px-4 py-2.5 text-sm font-medium text-white transition-colors hover:bg-plum-600 disabled:cursor-not-allowed disabled:opacity-50 ${className}`}
      {...rest}
    >
      {children}
    </button>
  );
}

export function SecondaryButton({
  children,
  className = "",
  ...rest
}: React.ButtonHTMLAttributes<HTMLButtonElement>) {
  return (
    <button
      className={`rounded-lg border border-plum-200 bg-white px-4 py-2.5 text-sm font-medium text-plum-700 transition-colors hover:bg-plum-50 disabled:cursor-not-allowed disabled:opacity-50 ${className}`}
      {...rest}
    >
      {children}
    </button>
  );
}

export function Field({
  label,
  children,
}: {
  label: string;
  children: ReactNode;
}) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-sm font-medium text-ink-950">
        {label}
      </span>
      {children}
    </label>
  );
}

export const inputClass =
  "w-full rounded-lg border border-plum-200 bg-white px-3.5 py-2.5 text-sm text-ink-950 placeholder:text-plum-700/40 focus:border-plum-400 focus:outline-none";

export function Notice({
  tone = "info",
  children,
}: {
  tone?: "info" | "error" | "success";
  children: ReactNode;
}) {
  const tones = {
    info: "bg-plum-50 text-plum-700",
    error: "bg-red-50 text-red-600",
    success: "bg-green-50 text-green-700",
  };
  return (
    <p role={tone === "error" ? "alert" : "status"} className={`rounded-lg px-3.5 py-2.5 text-sm ${tones[tone]}`}>
      {children}
    </p>
  );
}

export function Spinner({ label = "Loading..." }: { label?: string }) {
  return (
    <div className="flex items-center gap-3 text-sm text-plum-700/70" role="status">
      <span
        aria-hidden="true"
        className="h-4 w-4 animate-spin rounded-full border-2 border-plum-200 border-t-plum-500"
      />
      {label}
    </div>
  );
}

export function PageHeader({
  title,
  description,
}: {
  title: string;
  description?: string;
}) {
  return (
    <div>
      <h1 className="font-display text-2xl font-semibold text-ink-950">{title}</h1>
      {description && <p className="mt-1 text-sm text-plum-700/70">{description}</p>}
    </div>
  );
}
