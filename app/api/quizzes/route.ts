import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/require-user";

export const dynamic = "force-dynamic";

export async function GET() {
  const auth = await requireUser(["STUDENT"]);
  if (!auth.ok) return NextResponse.json({ error: auth.error }, { status: auth.status });

  const quizzes = await prisma.quiz.findMany({
    where: { level: auth.user.level ?? undefined },
    include: { course: true, _count: { select: { questions: true } } },
    orderBy: { createdAt: "desc" },
  });

  return NextResponse.json({
    quizzes: quizzes
      .filter((q) => q._count.questions > 0)
      .map((q) => ({
        id: q.id,
        title: q.title,
        course: q.course.code,
        level: q.level,
        difficulty: q.difficulty,
        questionCount: q._count.questions,
      })),
  });
}
