"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Card, Notice, PageHeader, Pill, Spinner, StatCard } from "@/components/ui";
import { api } from "@/lib/api-client";

type Summary = {
  fullName: string;
  username: string;
  level: number | null;
  rank: number | null;
  points: number;
  materialCount: number;
  courses: { id: string; code: string; title: string; level: number }[];
  recentMaterials: { id: string; title: string; course: { code: string } }[];
  announcements: { id: string; title: string; content: string; priority: string }[];
};

const SHORTCUTS = [
  { href: "/materials", label: "Study Materials" },
  { href: "/quiz", label: "Take a Quiz" },
  { href: "/exam", label: "Examinations" },
  { href: "/ai-tutor", label: "AI Tutor" },
  { href: "/leaderboard", label: "Leaderboard" },
];

export default function DashboardPage() {
  const [data, setData] = useState<Summary | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    api<Summary>("/api/dashboard-summary")
      .then(setData)
      .catch((e: Error) => setError(e.message));
  }, []);

  return (
    <div className="mx-auto max-w-5xl space-y-8">
      {error && <Notice tone="error">{error}</Notice>}
      {!data && !error && <Spinner label="Loading your dashboard..." />}

      {data && (
        <>
          <PageHeader
            title={`Welcome back, ${data.fullName.split(" ")[0]}`}
            description={`${data.level ?? "-"} Level · @${data.username}`}
          />

          <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
            <StatCard label="Rank this week" value={data.rank ? `#${data.rank}` : "Unranked"} />
            <StatCard label="Points this week" value={data.points.toLocaleString()} />
            <StatCard label="Courses this level" value={String(data.courses.length)} />
            <StatCard label="Materials available" value={String(data.materialCount)} />
          </div>

          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-5">
            {SHORTCUTS.map((a) => (
              <Link
                key={a.label}
                href={a.href}
                className="rounded-xl border border-plum-100 bg-white px-3 py-4 text-center text-sm font-medium text-plum-700 shadow-soft transition-colors hover:bg-plum-50"
              >
                {a.label}
              </Link>
            ))}
          </div>

          <div className="grid grid-cols-1 gap-6 md:grid-cols-3">
            <Card className="md:col-span-2">
              <h2 className="mb-3 font-display text-lg font-semibold text-ink-950">
                My Courses &mdash; {data.level ?? "-"} Level
              </h2>
              <div className="space-y-2">
                {data.courses.map((c) => (
                  <div
                    key={c.id}
                    className="flex items-center justify-between rounded-lg border border-plum-100 px-3 py-2.5"
                  >
                    <p className="text-sm font-medium text-ink-950">
                      {c.code} &mdash; {c.title}
                    </p>
                    <Pill>{c.level} Level</Pill>
                  </div>
                ))}
                {data.courses.length === 0 && (
                  <p className="text-sm text-plum-700/70">No courses have been set up for your level yet.</p>
                )}
              </div>

              <h3 className="mb-2 mt-6 text-sm font-semibold text-ink-950">Recently added materials</h3>
              <div className="space-y-2">
                {data.recentMaterials.map((m) => (
                  <div
                    key={m.id}
                    className="flex items-center justify-between rounded-lg border border-plum-100 px-3 py-2.5"
                  >
                    <p className="text-sm text-ink-950">{m.title}</p>
                    <Pill>{m.course.code}</Pill>
                  </div>
                ))}
                {data.recentMaterials.length === 0 && (
                  <p className="text-sm text-plum-700/70">No materials have been uploaded yet.</p>
                )}
              </div>
            </Card>

            <Card>
              <h2 className="mb-3 font-display text-lg font-semibold text-ink-950">Announcements</h2>
              <div className="space-y-4">
                {data.announcements.map((a) => (
                  <div key={a.id}>
                    <div className="flex items-center gap-2">
                      {a.priority === "HIGH" && <Pill tone="gold">Priority</Pill>}
                      <p className="text-sm font-medium text-ink-950">{a.title}</p>
                    </div>
                    <p className="mt-1 text-xs text-plum-700/70">{a.content}</p>
                  </div>
                ))}
                {data.announcements.length === 0 && (
                  <p className="text-sm text-plum-700/70">No announcements right now.</p>
                )}
              </div>
            </Card>
          </div>
        </>
      )}
    </div>
  );
}
