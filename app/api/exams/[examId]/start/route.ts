import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/require-user";

// EXAMINATION TIMER: the client never decides when time is up. On start, the
// server computes and stores serverEndAt = min(exam.endAt, now +
// durationMinutes). Every later check compares against this stored value, not
// anything the browser reports — so a refresh, a frozen tab, or a changed
// device clock can't extend the time.

const SUBMIT_GRACE_SECONDS = 30;

function shuffle<T>(items: T[]): T[] {
  const copy = [...items];
  for (let i = copy.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy;
}

export async function POST(
  _req: Request,
  { params }: { params: Promise<{ examId: string }> }
) {
  const { examId } = await params;

  const auth = await requireUser(["STUDENT"]);
  if (!auth.ok) return NextResponse.json({ error: auth.error }, { status: auth.status });

  const exam = await prisma.exam.findUnique({
    where: { id: examId },
    include: { questions: { include: { question: { include: { options: true } } } } },
  });
  if (!exam) return NextResponse.json({ error: "Exam not found." }, { status: 404 });
  if (exam.questions.length === 0) {
    return NextResponse.json({ error: "This exam has no questions yet." }, { status: 400 });
  }

  const now = new Date();

  // 1. Resume an in-progress attempt (refresh / reconnect) before doing any
  //    "attempts used up" check — otherwise a student with attemptLimit = 1
  //    would be locked out of their own running exam.
  let attempt = await prisma.examAttempt.findFirst({
    where: { examId: exam.id, userId: auth.user.id, status: "IN_PROGRESS" },
    orderBy: { serverStartAt: "desc" },
  });
  let resumed = false;

  if (attempt) {
    const expiredAt = attempt.serverEndAt.getTime() + SUBMIT_GRACE_SECONDS * 1000;
    if (now.getTime() > expiredAt) {
      // Time ran out while the student was away: close it out.
      await prisma.examAttempt.update({
        where: { id: attempt.id },
        data: { status: "EXPIRED", submittedAt: now, score: 0, percentage: 0 },
      });
      attempt = null;
    } else {
      resumed = true;
    }
  }

  // 2. Otherwise this is a fresh start: enforce window and attempt limits.
  if (!attempt) {
    if (now < exam.startAt) {
      return NextResponse.json({ error: "This exam has not opened yet." }, { status: 403 });
    }
    if (now > exam.endAt) {
      return NextResponse.json({ error: "This exam window has closed." }, { status: 403 });
    }

    const attemptCount = await prisma.examAttempt.count({
      where: { examId: exam.id, userId: auth.user.id },
    });
    if (attemptCount >= exam.attemptLimit) {
      return NextResponse.json({ error: "You have used all your attempts for this exam." }, { status: 403 });
    }

    attempt = await prisma.examAttempt.create({
      data: {
        examId: exam.id,
        userId: auth.user.id,
        serverEndAt: new Date(
          Math.min(exam.endAt.getTime(), now.getTime() + exam.durationMinutes * 60 * 1000)
        ),
      },
    });
  }

  // Strip correct answers before sending questions to the client.
  const ordered = [...exam.questions].sort((a, b) => a.order - b.order);
  const questions = (exam.randomizeQuestions ? shuffle(ordered) : ordered).map((eq) => ({
    id: eq.question.id,
    text: eq.question.text,
    options: (exam.randomizeAnswers ? shuffle(eq.question.options) : eq.question.options).map(
      (o) => ({ id: o.id, text: o.text })
    ),
  }));

  return NextResponse.json({
    attemptId: attempt.id,
    serverEndAt: attempt.serverEndAt,
    serverNow: new Date(),
    resumed,
    questions,
  });
}
