import { prisma } from "@/lib/prisma";

// Points model: each distinct quiz counts once per period (10 + your BEST
// percentage on it, so retaking a quiz can't farm points); each submitted
// exam attempt is worth 20 + its percentage. Shared by /api/leaderboard and
// /api/dashboard-summary so they can never disagree.

export type Period = "weekly" | "monthly";

export function parsePeriod(value: string | null | undefined): Period {
  return value === "monthly" ? "monthly" : "weekly";
}

// Nigeria is UTC+1 all year (no daylight saving). Weeks start on Monday.
const WAT_OFFSET_MS = 60 * 60 * 1000;

export function periodStart(period: Period): Date {
  const wat = new Date(Date.now() + WAT_OFFSET_MS);
  let startAsUtc: number;
  if (period === "weekly") {
    const daysSinceMonday = (wat.getUTCDay() + 6) % 7;
    startAsUtc = Date.UTC(
      wat.getUTCFullYear(),
      wat.getUTCMonth(),
      wat.getUTCDate() - daysSinceMonday
    );
  } else {
    startAsUtc = Date.UTC(wat.getUTCFullYear(), wat.getUTCMonth(), 1);
  }
  return new Date(startAsUtc - WAT_OFFSET_MS);
}

export async function computeLeaderboard(period: Period) {
  const since = periodStart(period);

  const [quizAttempts, examAttempts] = await Promise.all([
    prisma.quizAttempt.findMany({
      where: { completedAt: { gte: since } },
      select: { userId: true, quizId: true, percentage: true },
    }),
    prisma.examAttempt.findMany({
      where: { submittedAt: { gte: since }, status: "SUBMITTED" },
      select: { userId: true, percentage: true },
    }),
  ]);

  const bestQuiz = new Map<string, { userId: string; percentage: number }>();
  for (const a of quizAttempts) {
    const key = `${a.userId}:${a.quizId}`;
    const prev = bestQuiz.get(key);
    if (!prev || a.percentage > prev.percentage) {
      bestQuiz.set(key, { userId: a.userId, percentage: a.percentage });
    }
  }

  const points = new Map<string, number>();
  for (const a of bestQuiz.values()) {
    points.set(a.userId, (points.get(a.userId) ?? 0) + 10 + Math.round(a.percentage));
  }
  for (const a of examAttempts) {
    points.set(a.userId, (points.get(a.userId) ?? 0) + 20 + Math.round(a.percentage ?? 0));
  }

  const users = await prisma.user.findMany({
    where: {
      id: { in: [...points.keys()] },
      role: "STUDENT",
      isSuspended: false,
      isActive: true,
    },
    select: { id: true, fullName: true, username: true, level: true },
  });

  return users
    .map((u) => ({ ...u, points: points.get(u.id) ?? 0 }))
    .sort((a, b) => b.points - a.points || a.fullName.localeCompare(b.fullName))
    .map((row, i) => ({ ...row, rank: i + 1 }));
}
