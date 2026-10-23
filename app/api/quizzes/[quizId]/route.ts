import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/require-user";

export const dynamic = "force-dynamic";

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ quizId: string }> }
) {
  const { quizId } = await params;

  const auth = await requireUser(["STUDENT"]);
  if (!auth.ok) return NextResponse.json({ error: auth.error }, { status: auth.status });

  const quiz = await prisma.quiz.findUnique({
    where: { id: quizId },
    include: {
      course: true,
      questions: {
        orderBy: { order: "asc" },
        include: { question: { include: { options: true } } },
      },
    },
  });
  if (!quiz) return NextResponse.json({ error: "Quiz not found." }, { status: 404 });

  // Correct answers are never sent to the browser before grading.
  return NextResponse.json({
    id: quiz.id,
    title: quiz.title,
    course: quiz.course.code,
    questions: quiz.questions.map((qq) => ({
      id: qq.question.id,
      text: qq.question.text,
      options: qq.question.options.map((o) => ({ id: o.id, text: o.text })),
    })),
  });
}
