import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/require-user";
import { writeAuditLog } from "@/lib/audit";

// Network latency means an auto-submit fired at the exact deadline arrives a
// moment later. Allow a short grace window before calling it "late".
const SUBMIT_GRACE_SECONDS = 30;

const bodySchema = z.object({ answers: z.record(z.string(), z.string()) });

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ examId: string }> }
) {
  const { examId } = await params;

  const auth = await requireUser(["STUDENT"]);
  if (!auth.ok) return NextResponse.json({ error: auth.error }, { status: auth.status });

  const parsed = bodySchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Missing answers." }, { status: 400 });
  const { answers } = parsed.data; // { questionId: optionId }

  const attempt = await prisma.examAttempt.findFirst({
    where: { examId, userId: auth.user.id, status: "IN_PROGRESS" },
    orderBy: { serverStartAt: "desc" },
  });
  if (!attempt) {
    return NextResponse.json({ error: "No in-progress attempt found for this exam." }, { status: 400 });
  }

  const exam = await prisma.exam.findUnique({
    where: { id: examId },
    include: { questions: { orderBy: { order: "asc" }, include: { question: true } } },
  });
  if (!exam) return NextResponse.json({ error: "Exam not found." }, { status: 404 });

  const now = new Date();
  const late = now.getTime() > attempt.serverEndAt.getTime() + SUBMIT_GRACE_SECONDS * 1000;

  let correct = 0;
  const breakdown = exam.questions.map((eq) => {
    const isCorrect = answers[eq.question.id] === eq.question.correctOptionId;
    if (isCorrect) correct += 1;
    return {
      questionId: eq.question.id,
      correct: isCorrect,
      correctOptionId: eq.question.correctOptionId,
      explanation: eq.question.explanation,
    };
  });
  const total = exam.questions.length;
  const percentage = total > 0 ? (correct / total) * 100 : 0;

  // updateMany with a status condition makes double-submits (timer + button)
  // safe: only the first one wins.
  const result = await prisma.examAttempt.updateMany({
    where: { id: attempt.id, status: "IN_PROGRESS" },
    data: {
      answers,
      score: correct,
      percentage,
      submittedAt: now,
      status: late ? "EXPIRED" : "SUBMITTED",
    },
  });
  if (result.count === 0) {
    return NextResponse.json({ error: "This exam was already submitted." }, { status: 409 });
  }

  await writeAuditLog({
    actorId: auth.user.id,
    action: "EXAM_SUBMITTED",
    resource: `exam:${exam.id}`,
    status: "SUCCESS",
    metadata: { attemptId: attempt.id, late },
  });

  return NextResponse.json({
    score: correct,
    total,
    percentage,
    passed: percentage >= exam.passMark,
    late,
    revealAnswers: exam.revealAnswers,
    breakdown: exam.revealAnswers ? breakdown : undefined,
  });
}
