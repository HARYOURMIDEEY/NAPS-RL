import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/require-user";

const bodySchema = z.object({ answers: z.record(z.string(), z.string()) });

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ quizId: string }> }
) {
  const { quizId } = await params;

  const auth = await requireUser(["STUDENT"]);
  if (!auth.ok) return NextResponse.json({ error: auth.error }, { status: auth.status });

  const parsed = bodySchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Missing answers." }, { status: 400 });
  const { answers } = parsed.data;

  const quiz = await prisma.quiz.findUnique({
    where: { id: quizId },
    include: { questions: { orderBy: { order: "asc" }, include: { question: true } } },
  });
  if (!quiz) return NextResponse.json({ error: "Quiz not found." }, { status: 404 });
  if (quiz.questions.length === 0) {
    return NextResponse.json({ error: "This quiz has no questions yet." }, { status: 400 });
  }

  let correct = 0;
  const breakdown = quiz.questions.map((qq) => {
    const isCorrect = answers[qq.question.id] === qq.question.correctOptionId;
    if (isCorrect) correct += 1;
    return {
      questionId: qq.question.id,
      correct: isCorrect,
      correctOptionId: qq.question.correctOptionId,
      explanation: qq.question.explanation,
    };
  });
  const percentage = (correct / quiz.questions.length) * 100;

  await prisma.quizAttempt.create({
    data: {
      quizId: quiz.id,
      userId: auth.user.id,
      answers,
      score: correct,
      percentage,
      completedAt: new Date(),
    },
  });

  return NextResponse.json({ score: correct, total: quiz.questions.length, percentage, breakdown });
}
