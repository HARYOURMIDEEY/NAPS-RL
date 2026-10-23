import Link from "next/link";
import Footer from "@/components/Footer";
import { Card } from "@/components/ui";
import { Icon } from "@/components/icons";

const FEATURES = [
  {
    icon: "folder",
    title: "Study Materials",
    body: "Lecture notes, past questions and course resources organised by level and course.",
  },
  {
    icon: "sparkle",
    title: "AI Physics Tutor",
    body: "Ask about a concept or a formula and get a clear, step-by-step explanation.",
  },
  {
    icon: "check",
    title: "Practice Quizzes",
    body: "Test yourself, get instant feedback, and see the reasoning behind every answer.",
  },
  {
    icon: "clock",
    title: "Timed Examinations",
    body: "Continuous-assessment exams with a server-verified timer you can't accidentally reset.",
  },
  {
    icon: "trophy",
    title: "Weekly Leaderboard",
    body: "Stay motivated with weekly and monthly rankings across the department.",
  },
] as const;

const STEPS = [
  { n: "1", title: "Create your account", body: "Register with your FUTMinna student email and matric number." },
  { n: "2", title: "Verify your email", body: "Enter the 6-digit code we send to your personal email." },
  { n: "3", title: "Start learning", body: "Open your level's materials, take quizzes and track your rank." },
];

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-paper">
      <header className="mx-auto flex max-w-6xl items-center justify-between px-6 py-5">
        <div>
          <p className="font-display text-lg font-semibold text-plum-600">NAPS E-Learning</p>
          <p className="text-xs text-plum-700/60">Department of Physics &middot; FUTMinna</p>
        </div>
        <nav className="flex items-center gap-3" aria-label="Account">
          <Link href="/login" className="text-sm font-medium text-plum-700 hover:text-plum-600">
            Log in
          </Link>
          <Link
            href="/register"
            className="rounded-lg bg-plum-500 px-4 py-2 text-sm font-medium text-white hover:bg-plum-600"
          >
            Create account
          </Link>
        </nav>
      </header>

      <main>
        <section className="mx-auto max-w-3xl px-6 pb-14 pt-10 text-center md:pt-16">
          <p className="mb-3 text-sm font-medium text-plum-600">
            National Association of Physics Students
          </p>
          <h1 className="font-display text-3xl font-semibold leading-tight text-ink-950 md:text-5xl">
            One place to study, practise, and track your Physics progress.
          </h1>
          <p className="mx-auto mt-4 max-w-xl text-plum-700/80 md:text-lg">
            Built for 100 to 500 Level Physics students at FUTMinna: materials, quizzes, timed
            examinations and an AI tutor, personalised to your level.
          </p>
          <div className="mt-8 flex flex-col items-center justify-center gap-3 sm:flex-row">
            <Link
              href="/register"
              className="w-full rounded-lg bg-plum-500 px-6 py-3 text-sm font-medium text-white hover:bg-plum-600 sm:w-auto"
            >
              Get started
            </Link>
            <Link
              href="/login"
              className="w-full rounded-lg border border-plum-200 px-6 py-3 text-sm font-medium text-plum-700 hover:bg-plum-50 sm:w-auto"
            >
              I already have an account
            </Link>
          </div>
        </section>

        <section
          aria-label="Features"
          className="mx-auto grid max-w-6xl grid-cols-1 gap-4 px-6 pb-16 sm:grid-cols-2 lg:grid-cols-5"
        >
          {FEATURES.map((f) => (
            <Card key={f.title}>
              <span className="mb-3 inline-flex h-9 w-9 items-center justify-center rounded-lg bg-plum-50 text-plum-600">
                <Icon name={f.icon} />
              </span>
              <p className="font-display text-base font-semibold text-ink-950">{f.title}</p>
              <p className="mt-2 text-sm text-plum-700/75">{f.body}</p>
            </Card>
          ))}
        </section>

        <section aria-label="How it works" className="border-y border-plum-100 bg-white">
          <div className="mx-auto max-w-5xl px-6 py-14">
            <h2 className="text-center font-display text-2xl font-semibold text-ink-950">
              Get started in three steps
            </h2>
            <ol className="mt-8 grid grid-cols-1 gap-6 md:grid-cols-3">
              {STEPS.map((s) => (
                <li key={s.n} className="text-center">
                  <span className="mx-auto flex h-10 w-10 items-center justify-center rounded-full bg-plum-500 font-display text-lg font-semibold text-white">
                    {s.n}
                  </span>
                  <p className="mt-3 font-medium text-ink-950">{s.title}</p>
                  <p className="mt-1 text-sm text-plum-700/75">{s.body}</p>
                </li>
              ))}
            </ol>
          </div>
        </section>
      </main>

      <Footer />
    </div>
  );
}
