"use client";

import { useEffect } from "react";

export default function GlobalRouteError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <main className="mx-auto flex min-h-screen max-w-md flex-col items-center justify-center px-6 text-center">
      <h1 className="font-display text-2xl font-semibold text-ink-950">Something went wrong</h1>
      <p className="mt-2 text-sm text-plum-700/70">
        An unexpected error occurred. You can try again, and if it keeps happening please let a NAPS
        administrator know.
      </p>
      {error.digest && <p className="mt-2 text-xs text-plum-700/50">Reference: {error.digest}</p>}
      <button
        onClick={reset}
        className="mt-6 rounded-lg bg-plum-500 px-5 py-2.5 text-sm font-medium text-white hover:bg-plum-600"
      >
        Try again
      </button>
    </main>
  );
}
