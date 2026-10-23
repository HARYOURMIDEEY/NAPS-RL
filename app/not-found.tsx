import Link from "next/link";

export default function NotFound() {
  return (
    <main className="mx-auto flex min-h-screen max-w-md flex-col items-center justify-center px-6 text-center">
      <p className="font-display text-5xl font-semibold text-plum-500">404</p>
      <h1 className="mt-3 font-display text-2xl font-semibold text-ink-950">Page not found</h1>
      <p className="mt-2 text-sm text-plum-700/70">
        The page you're looking for doesn't exist or has moved.
      </p>
      <Link
        href="/"
        className="mt-6 rounded-lg bg-plum-500 px-5 py-2.5 text-sm font-medium text-white hover:bg-plum-600"
      >
        Back to home
      </Link>
    </main>
  );
}
