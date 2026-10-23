import { redirect } from "next/navigation";
import { Card, PageHeader, Pill, StatCard } from "@/components/ui";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/require-user";

// Server Component: runs requireUser() against the database on every load, on
// top of the middleware redirect (defence in depth, see lib/require-user.ts).
export const dynamic = "force-dynamic";

const LAGOS_DATE = new Intl.DateTimeFormat("en-NG", {
  dateStyle: "medium",
  timeStyle: "short",
  timeZone: "Africa/Lagos",
});

export default async function AdminAnalyticsPage() {
  const auth = await requireUser(["ADMIN", "SUPER_ADMIN"], { allowPendingPasswordChange: true });
  if (!auth.ok) redirect("/admin/login");
  if (auth.user.mustChangePassword) redirect("/settings/change-password?forced=1");

  const [totalStudents, levelCounts, materialCount, quizAttempts, topMaterials, recentAudit] =
    await Promise.all([
      prisma.user.count({ where: { role: "STUDENT" } }),
      prisma.user.groupBy({
        by: ["level"],
        where: { role: "STUDENT", level: { not: null } },
        _count: { _all: true },
      }),
      prisma.material.count(),
      prisma.quizAttempt.aggregate({ _avg: { percentage: true }, _count: { _all: true } }),
      prisma.material.findMany({ orderBy: { downloadCount: "desc" }, take: 5 }),
      prisma.auditLog.findMany({
        orderBy: { createdAt: "desc" },
        take: 8,
        include: { actor: true },
      }),
    ]);

  const totalWithLevel = levelCounts.reduce((sum, r) => sum + r._count._all, 0) || 1;
  const sortedLevels = [...levelCounts].sort((a, b) => (a.level ?? 0) - (b.level ?? 0));

  return (
    <div className="mx-auto max-w-6xl space-y-8">
      <PageHeader
        title="Platform Analytics"
        description="Live data from the database across all levels and courses."
      />

      <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
        <StatCard label="Total students" value={totalStudents.toLocaleString()} />
        <StatCard label="Materials uploaded" value={materialCount.toLocaleString()} />
        <StatCard label="Quiz attempts" value={quizAttempts._count._all.toLocaleString()} />
        <StatCard
          label="Avg. quiz score"
          value={quizAttempts._avg.percentage ? `${Math.round(quizAttempts._avg.percentage)}%` : "-"}
        />
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <Card>
          <h2 className="mb-3 font-display text-lg font-semibold text-ink-950">Students by level</h2>
          <div className="space-y-3">
            {sortedLevels.map((r) => (
              <div key={r.level}>
                <div className="flex justify-between text-sm text-ink-950">
                  <span>{r.level} Level</span>
                  <span className="text-plum-700/60">{r._count._all}</span>
                </div>
                <div className="mt-1 h-2 rounded-full bg-plum-50">
                  <div
                    className="h-2 rounded-full bg-plum-500"
                    style={{ width: `${Math.round((r._count._all / totalWithLevel) * 100)}%` }}
                  />
                </div>
              </div>
            ))}
            {sortedLevels.length === 0 && (
              <p className="text-sm text-plum-700/70">No students registered yet.</p>
            )}
          </div>
        </Card>

        <Card>
          <h2 className="mb-3 font-display text-lg font-semibold text-ink-950">Most downloaded materials</h2>
          <div className="space-y-2 text-sm">
            {topMaterials.map((m) => (
              <div key={m.id} className="flex justify-between gap-3 border-b border-plum-50 pb-2">
                <span className="truncate text-ink-950">{m.title}</span>
                <span className="shrink-0 text-plum-700/60">{m.downloadCount} downloads</span>
              </div>
            ))}
            {topMaterials.length === 0 && <p className="text-plum-700/70">No materials uploaded yet.</p>}
          </div>
        </Card>
      </div>

      <Card>
        <div className="mb-3 flex items-center justify-between">
          <h2 className="font-display text-lg font-semibold text-ink-950">Recent audit log</h2>
          <Pill>Admin only</Pill>
        </div>
        <div className="space-y-2">
          {recentAudit.map((entry) => (
            <div
              key={entry.id}
              className="flex flex-col justify-between gap-1 border-b border-plum-50 pb-2 text-sm sm:flex-row sm:items-center"
            >
              <span className="text-ink-950">
                <strong className="font-medium">{entry.actor.username}</strong>{" "}
                {entry.action.replaceAll("_", " ").toLowerCase()} &mdash; {entry.resource}
              </span>
              <span className="text-xs text-plum-700/50">{LAGOS_DATE.format(entry.createdAt)}</span>
            </div>
          ))}
          {recentAudit.length === 0 && <p className="text-sm text-plum-700/70">No audit log entries yet.</p>}
        </div>
      </Card>
    </div>
  );
}
