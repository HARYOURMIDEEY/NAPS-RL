import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/require-user";

export const dynamic = "force-dynamic";

export async function GET() {
  const auth = await requireUser(["STUDENT"]);
  if (!auth.ok) return NextResponse.json({ error: auth.error }, { status: auth.status });

  const now = new Date();
  const exams = await prisma.exam.findMany({
    where: { level: auth.user.level ?? undefined },
    include: {
      course: true,
      _count: { select: { questions: true } },
      attempts: { where: { userId: auth.user.id } },
    },
    orderBy: { startAt: "asc" },
  });

  return NextResponse.json({
    exams: exams
      .filter((e) => e._count.questions > 0)
      .map((e) => {
        const isOpen = now >= e.startAt && now <= e.endAt;
        const hasAttemptsLeft = e.attempts.length < e.attemptLimit;
        const inProgress = e.attempts.some(
          (a) => a.status === "IN_PROGRESS" && a.serverEndAt > now
        );
        return {
          id: e.id,
          title: e.title,
          course: e.course.code,
          durationMinutes: e.durationMinutes,
          startAt: e.startAt,
          endAt: e.endAt,
          passMark: e.passMark,
          questionCount: e._count.questions,
          attemptsUsed: e.attempts.length,
          attemptLimit: e.attemptLimit,
          isOpen,
          hasAttemptsLeft,
          inProgress,
          canStart: inProgress || (isOpen && hasAttemptsLeft),
        };
      }),
  });
}
