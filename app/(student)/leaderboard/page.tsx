"use client";

import { useEffect, useState } from "react";
import { Card, Notice, PageHeader, Spinner } from "@/components/ui";
import { api } from "@/lib/api-client";

type Row = {
  id: string;
  fullName: string;
  username: string;
  level: number | null;
  points: number;
  rank: number;
};

const MEDAL: Record<number, string> = {
  1: "bg-gold-500 text-white",
  2: "bg-plum-200 text-plum-800",
  3: "bg-gold-400/40 text-gold-600",
};

export default function LeaderboardPage() {
  const [period, setPeriod] = useState<"weekly" | "monthly">("weekly");
  const [rows, setRows] = useState<Row[] | null>(null);
  const [you, setYou] = useState<Row | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    setRows(null);
    setError(null);
    api<{ leaderboard: Row[]; you: Row | null }>(`/api/leaderboard?period=${period}`)
      .then((data) => {
        if (cancelled) return;
        setRows(data.leaderboard);
        setYou(data.you);
      })
      .catch((e: Error) => !cancelled && setError(e.message));
    return () => {
      cancelled = true;
    };
  }, [period]);

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <div className="flex items-center justify-between gap-4">
        <PageHeader
          title="Leaderboard"
          description="Points come from quizzes (best score per quiz) and examinations."
        />
        <div className="flex shrink-0 rounded-lg border border-plum-200 bg-white p-1" role="group" aria-label="Period">
          {(["weekly", "monthly"] as const).map((p) => (
            <button
              key={p}
              onClick={() => setPeriod(p)}
              aria-pressed={period === p}
              className={`rounded-md px-3 py-1.5 text-sm font-medium capitalize ${
                period === p ? "bg-plum-500 text-white" : "text-plum-700"
              }`}
            >
              {p}
            </button>
          ))}
        </div>
      </div>

      {error && <Notice tone="error">{error}</Notice>}
      {!rows && !error && <Spinner />}

      {rows && rows.length === 0 && (
        <Card>
          <p className="text-sm text-plum-700/70">
            No {period} activity yet. Complete a quiz or exam to appear here.
          </p>
        </Card>
      )}

      {rows && rows.length > 0 && (
        <Card>
          <ol className="divide-y divide-plum-100">
            {rows.map((row) => {
              const isYou = you?.id === row.id;
              return (
                <li
                  key={row.id}
                  className={`flex items-center justify-between py-3 ${
                    isYou ? "rounded-lg bg-plum-50 px-3" : "px-1"
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <span
                      className={`flex h-7 w-7 items-center justify-center rounded-full text-xs font-semibold ${
                        MEDAL[row.rank] ?? "text-plum-600"
                      }`}
                    >
                      {row.rank}
                    </span>
                    <div>
                      <p className="text-sm font-medium text-ink-950">
                        {row.fullName} {isYou && <span className="text-xs text-plum-600">(you)</span>}
                      </p>
                      <p className="text-xs text-plum-700/60">{row.level ?? "-"} Level</p>
                    </div>
                  </div>
                  <p className="font-medium text-ink-950">{row.points.toLocaleString()} pts</p>
                </li>
              );
            })}
          </ol>
        </Card>
      )}

      {you && rows && !rows.find((r) => r.id === you.id) && (
        <Card>
          <p className="text-sm text-plum-700/70">
            Your {period} rank: <span className="font-medium text-ink-950">#{you.rank}</span> with{" "}
            {you.points} pts
          </p>
        </Card>
      )}
    </div>
  );
}
