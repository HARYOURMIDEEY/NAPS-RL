import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/require-user";
import { computeLeaderboard } from "@/lib/scoring";

export const dynamic = "force-dynamic";

export async function GET() {
  const auth = await requireUser(["STUDENT"]);
  if (!auth.ok) return NextResponse.json({ error: auth.error }, { status: auth.status });

  const level = auth.user.level ?? undefined;
  const now = new Date();

  const [courses, materialCount, recentMaterials, announcements, weekly] = await Promise.all([
    prisma.course.findMany({ where: { level }, orderBy: { code: "asc" } }),
    prisma.material.count({ where: { level } }),
    prisma.material.findMany({
      where: { level },
      orderBy: { createdAt: "desc" },
      take: 3,
      include: { course: true },
    }),
    prisma.announcement.findMany({
      where: {
        AND: [
          { OR: [{ targetLevel: null }, { targetLevel: level }] },
          { publishAt: { lte: now } },
          { OR: [{ expireAt: null }, { expireAt: { gte: now } }] },
        ],
      },
      orderBy: { publishAt: "desc" },
      take: 5,
    }),
    computeLeaderboard("weekly"),
  ]);

  const you = weekly.find((r) => r.id === auth.user.id);

  return NextResponse.json({
    fullName: auth.user.fullName,
    username: auth.user.username,
    level: auth.user.level,
    rank: you?.rank ?? null,
    points: you?.points ?? 0,
    materialCount,
    courses,
    recentMaterials,
    announcements,
  });
}
