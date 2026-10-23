"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Card, Notice, PageHeader, Pill, PrimaryButton, SecondaryButton, Spinner } from "@/components/ui";
import { ApiError, LAGOS_DATE, api, postJson } from "@/lib/api-client";

// The countdown shown here is cosmetic. The real deadline (serverEndAt) is
// computed and stored by the server when the exam starts, and submissions are
// checked against that stored value, so a refresh, a frozen tab or a wrong
// device clock can't extend it. We only correct the on-screen countdown for
// clock drift using the server's reported "now".

type ExamSummary = {
  id: string;
  title: string;
  course: string;
  durationMinutes: number;
  questionCount: number;
  passMark: number;
  startAt: string;
  endAt: string;
  isOpen: boolean;
  hasAttemptsLeft: boolean;
  inProgress: boolean;
  canStart: boolean;
  attemptsUsed: number;
  attemptLimit: number;
};

type ExamQuestion = { id: string; text: string; options: { id: string; text: string }[] };

type StartResponse = {
  attemptId: string;
  serverEndAt: string;
  serverNow: string;
  resumed: boolean;
  questions: ExamQuestion[];
};

type Breakdown = {
  questionId: string;
  correct: boolean;
  correctOptionId: string | null;
  explanation: string | null;
};

type Result = {
  score: number;
  total: number;
  percentage: number;
  passed: boolean;
  late: boolean;
  revealAnswers: boolean;
  breakdown?: Breakdown[];
};

type ActiveExam = { examId: string; questions: ExamQuestion[]; endsAtLocal: number; resumed: boolean };

export default function ExamPage() {
  const [list, setList] = useState<ExamSummary[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [active, setActive] = useState<ActiveExam | null>(null);
  const [remaining, setRemaining] = useState(0);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [result, setResult] = useState<Result | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [starting, setStarting] = useState<string | null>(null);

  // Refs let the timer callback always see the latest values (state captured
  // by an interval would otherwise be stale and auto-submit EMPTY answers).
  const activeRef = useRef<ActiveExam | null>(null);
  const answersRef = useRef<Record<string, string>>({});
  const submittingRef = useRef(false);
  const autoSubmittedRef = useRef(false);

  const loadList = useCallback(() => {
    api<{ exams: ExamSummary[] }>("/api/exams")
      .then((data) => setList(data.exams))
      .catch((e: Error) => setError(e.message));
  }, []);

  useEffect(() => {
    loadList();
  }, [loadList]);

  const submit = useCallback(async () => {
    const current = activeRef.current;
    if (!current || submittingRef.current) return;
    submittingRef.current = true;
    setSubmitting(true);
    setError(null);
    try {
      const data = await postJson<Result>(`/api/exams/${current.examId}/submit`, {
        answers: answersRef.current,
      });
      setResult(data);
    } catch (e) {
      const err = e as ApiError;
      setError(err.message);
      // The attempt no longer exists or was already closed: stop the timer.
      if (err.status === 400 || err.status === 409) {
        activeRef.current = null;
        setActive(null);
        loadList();
      }
    } finally {
      submittingRef.current = false;
      setSubmitting(false);
    }
  }, [loadList]);

  useEffect(() => {
    if (!active || result) return;
    function tick() {
      const current = activeRef.current;
      if (!current) return;
      const secs = Math.max(0, Math.floor((current.endsAtLocal - Date.now()) / 1000));
      setRemaining(secs);
      if (secs <= 0 && !autoSubmittedRef.current) {
        autoSubmittedRef.current = true;
        void submit(); // auto-submit whatever has been answered
      }
    }
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, [active, result, submit]);

  async function start(examId: string) {
    setError(null);
    setStarting(examId);
    try {
      const clientNow = Date.now();
      const data = await postJson<StartResponse>(`/api/exams/${examId}/start`, {});
      const offset = new Date(data.serverNow).getTime() - clientNow; // server clock minus device clock
      const next: ActiveExam = {
        examId,
        questions: data.questions,
        endsAtLocal: new Date(data.serverEndAt).getTime() - offset,
        resumed: data.resumed,
      };
      activeRef.current = next;
      answersRef.current = {};
      autoSubmittedRef.current = false;
      setAnswers({});
      setResult(null);
      setActive(next);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setStarting(null);
    }
  }

  function choose(questionId: string, optionId: string) {
    const next = { ...answersRef.current, [questionId]: optionId };
    answersRef.current = next;
    setAnswers(next);
  }

  function handleManualSubmit() {
    if (!active) return;
    const unanswered = active.questions.filter((q) => !answersRef.current[q.id]).length;
    if (unanswered > 0 && !window.confirm(`You have ${unanswered} unanswered question(s). Submit anyway?`)) {
      return;
    }
    void submit();
  }

  function backToList() {
    activeRef.current = null;
    setActive(null);
    setResult(null);
    setList(null);
    loadList();
  }

  const minutes = String(Math.floor(remaining / 60)).padStart(2, "0");
  const seconds = String(remaining % 60).padStart(2, "0");

  return (
    <div className="mx-auto max-w-2xl space-y-4">
      {error && <Notice tone="error">{error}</Notice>}

      {!active && !result && (
        <>
          <PageHeader title="Examinations" description="Timed continuous-assessment examinations for your level." />
          {!list && !error && <Spinner />}
          {list && list.length === 0 && (
            <Card>
              <p className="text-sm text-plum-700/70">No examinations are scheduled for your level right now.</p>
            </Card>
          )}
          <div className="space-y-3">
            {list?.map((e) => (
              <Card key={e.id}>
                <p className="font-medium text-ink-950">{e.title}</p>
                <div className="mt-2 flex flex-wrap gap-2">
                  <Pill>{e.course}</Pill>
                  <Pill>{e.questionCount} questions</Pill>
                  <Pill>{e.durationMinutes} min</Pill>
                  <Pill tone="gold">Pass mark {e.passMark}%</Pill>
                  {e.inProgress && <Pill tone="gold">In progress</Pill>}
                  {!e.isOpen && !e.inProgress && <Pill tone="danger">Closed</Pill>}
                  {!e.hasAttemptsLeft && !e.inProgress && <Pill tone="danger">No attempts left</Pill>}
                </div>
                <p className="mt-2 text-xs text-plum-700/60">
                  Window: {LAGOS_DATE.format(new Date(e.startAt))} &ndash; {LAGOS_DATE.format(new Date(e.endAt))}{" "}
                  &middot; {e.attemptsUsed}/{e.attemptLimit} attempts used
                </p>
                <PrimaryButton
                  className="mt-3"
                  onClick={() => start(e.id)}
                  disabled={!e.canStart || starting !== null}
                >
                  {starting === e.id
                    ? "Starting..."
                    : e.inProgress
                      ? "Resume examination"
                      : e.canStart
                        ? "Start examination"
                        : "Not available"}
                </PrimaryButton>
              </Card>
            ))}
          </div>
        </>
      )}

      {active && !result && (
        <div className="space-y-4">
          <div className="sticky top-0 z-10 flex items-center justify-between rounded-xl border border-plum-100 bg-white px-4 py-3 shadow-soft">
            <p className="text-sm font-medium text-ink-950">Time remaining</p>
            <p
              className={`font-display text-xl font-semibold ${remaining < 60 ? "text-red-600" : "text-plum-600"}`}
              aria-live="off"
            >
              {minutes}:{seconds}
            </p>
          </div>

          {active.resumed && (
            <Notice>
              Your examination was resumed. The timer kept running while you were away, and earlier answers were
              not saved, so please answer again.
            </Notice>
          )}

          {active.questions.map((q, i) => (
            <Card key={q.id}>
              <p className="text-sm font-medium text-ink-950">
                {i + 1}. {q.text}
              </p>
              <div className="mt-3 space-y-2">
                {q.options.map((opt) => (
                  <button
                    key={opt.id}
                    onClick={() => choose(q.id, opt.id)}
                    aria-pressed={answers[q.id] === opt.id}
                    className={`w-full rounded-lg border px-3.5 py-2.5 text-left text-sm transition-colors ${
                      answers[q.id] === opt.id ? "border-plum-400 bg-plum-50" : "border-plum-200 hover:bg-plum-50"
                    }`}
                  >
                    {opt.text}
                  </button>
                ))}
              </div>
            </Card>
          ))}

          <PrimaryButton className="w-full" onClick={handleManualSubmit} disabled={submitting}>
            {submitting ? "Submitting..." : "Submit examination"}
          </PrimaryButton>
        </div>
      )}

      {result && active && (
        <Card>
          <h2 className="font-display text-xl font-semibold text-ink-950">Examination submitted</h2>
          <p className="mt-2 text-sm text-plum-700/70">
            {result.late
              ? "This submission arrived after the deadline and was recorded as expired."
              : "Your submission has been recorded."}
          </p>
          <p className="mt-4 text-3xl font-semibold text-plum-600">
            {result.score}/{result.total}
          </p>
          <p className={`text-sm font-medium ${result.passed ? "text-green-700" : "text-red-600"}`}>
            {result.passed ? "Passed" : "Did not meet the pass mark"}
          </p>

          {!result.revealAnswers && (
            <p className="mt-2 text-xs text-plum-700/60">
              Correct answers aren&apos;t shown for this exam. Check with your course administrator.
            </p>
          )}

          {result.revealAnswers && result.breakdown && (
            <div className="mt-5 space-y-3">
              {active.questions.map((q, i) => {
                const b = result.breakdown?.find((x) => x.questionId === q.id);
                if (!b) return null;
                const correctText = q.options.find((o) => o.id === b.correctOptionId)?.text ?? "";
                return (
                  <div
                    key={q.id}
                    className={`rounded-lg px-3.5 py-3 text-sm ${
                      b.correct ? "bg-green-50 text-green-800" : "bg-red-50 text-red-700"
                    }`}
                  >
                    <p className="font-medium">
                      {i + 1}. {q.text}
                    </p>
                    <p className="mt-1">{b.correct ? "Correct" : `Incorrect. Correct answer: ${correctText}`}</p>
                    {b.explanation && <p className="mt-1 opacity-90">{b.explanation}</p>}
                  </div>
                );
              })}
            </div>
          )}

          <SecondaryButton className="mt-5" onClick={backToList}>
            Back to exam list
          </SecondaryButton>
        </Card>
      )}
    </div>
  );
}
