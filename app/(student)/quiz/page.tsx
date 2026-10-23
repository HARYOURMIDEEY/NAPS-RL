"use client";

import { useEffect, useState } from "react";
import { Card, Notice, PageHeader, Pill, PrimaryButton, SecondaryButton, Spinner } from "@/components/ui";
import { api, postJson } from "@/lib/api-client";

type QuizSummary = {
  id: string;
  title: string;
  course: string;
  difficulty: string | null;
  questionCount: number;
};

type QuizQuestion = { id: string; text: string; options: { id: string; text: string }[] };
type QuizDetail = { id: string; title: string; course: string; questions: QuizQuestion[] };
type Breakdown = {
  questionId: string;
  correct: boolean;
  correctOptionId: string | null;
  explanation: string | null;
};
type Result = { score: number; total: number; percentage: number; breakdown: Breakdown[] };

export default function QuizPage() {
  const [list, setList] = useState<QuizSummary[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [active, setActive] = useState<QuizDetail | null>(null);
  const [index, setIndex] = useState(0);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [result, setResult] = useState<Result | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    api<{ quizzes: QuizSummary[] }>("/api/quizzes")
      .then((data) => setList(data.quizzes))
      .catch((e: Error) => setError(e.message));
  }, []);

  async function startQuiz(quizId: string) {
    setBusy(true);
    setError(null);
    try {
      const data = await api<QuizDetail>(`/api/quizzes/${quizId}`);
      setActive(data);
      setIndex(0);
      setAnswers({});
      setResult(null);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }

  const question = active?.questions[index];
  const selected = question ? answers[question.id] : undefined;

  async function finish() {
    if (!active) return;
    setBusy(true);
    setError(null);
    try {
      setResult(await postJson<Result>(`/api/quiz/${active.id}/submit`, { answers }));
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }

  function next() {
    if (!active) return;
    if (index < active.questions.length - 1) setIndex(index + 1);
    else void finish();
  }

  function restart() {
    setActive(null);
    setResult(null);
    setAnswers({});
    setIndex(0);
  }

  const optionText = (q: QuizQuestion, optionId: string | null) =>
    q.options.find((o) => o.id === optionId)?.text ?? "";

  return (
    <div className="mx-auto max-w-2xl space-y-4">
      {error && <Notice tone="error">{error}</Notice>}

      {!active && (
        <>
          <PageHeader title="Practice Quizzes" description="Revise at your own pace and get instant feedback." />
          {!list && !error && <Spinner />}
          {list && list.length === 0 && (
            <Card>
              <p className="text-sm text-plum-700/70">No quizzes have been published for your level yet.</p>
            </Card>
          )}
          <div className="space-y-3">
            {list?.map((q) => (
              <Card key={q.id} className="flex items-center justify-between gap-4">
                <div>
                  <p className="font-medium text-ink-950">{q.title}</p>
                  <div className="mt-1.5 flex gap-2">
                    <Pill>{q.course}</Pill>
                    <Pill>{q.questionCount} questions</Pill>
                  </div>
                </div>
                <PrimaryButton onClick={() => startQuiz(q.id)} disabled={busy}>
                  Start
                </PrimaryButton>
              </Card>
            ))}
          </div>
        </>
      )}

      {active && !result && question && (
        <Card>
          <div className="mb-3 flex items-center justify-between">
            <Pill>
              Question {index + 1} of {active.questions.length}
            </Pill>
            <span className="text-xs text-plum-700/60">{active.title}</span>
          </div>
          <div
            className="mb-4 h-1.5 rounded-full bg-plum-50"
            role="progressbar"
            aria-valuenow={index + 1}
            aria-valuemin={1}
            aria-valuemax={active.questions.length}
          >
            <div
              className="h-1.5 rounded-full bg-plum-500 transition-all"
              style={{ width: `${((index + 1) / active.questions.length) * 100}%` }}
            />
          </div>
          <p className="font-medium text-ink-950">{question.text}</p>
          <div className="mt-4 space-y-2">
            {question.options.map((opt) => (
              <button
                key={opt.id}
                onClick={() => setAnswers((a) => ({ ...a, [question.id]: opt.id }))}
                aria-pressed={selected === opt.id}
                className={`w-full rounded-lg border px-3.5 py-2.5 text-left text-sm transition-colors ${
                  selected === opt.id ? "border-plum-400 bg-plum-50" : "border-plum-200 hover:bg-plum-50"
                }`}
              >
                {opt.text}
              </button>
            ))}
          </div>
          <PrimaryButton className="mt-5" onClick={next} disabled={!selected || busy}>
            {index < active.questions.length - 1 ? "Next question" : busy ? "Submitting..." : "Finish quiz"}
          </PrimaryButton>
        </Card>
      )}

      {active && result && (
        <Card>
          <h2 className="font-display text-xl font-semibold text-ink-950">Quiz complete</h2>
          <p className="mt-2 text-3xl font-semibold text-plum-600">{Math.round(result.percentage)}%</p>
          <p className="text-sm text-plum-700/70">
            {result.score} of {result.total} correct
          </p>
          <div className="mt-5 space-y-3">
            {active.questions.map((q, i) => {
              const b = result.breakdown.find((x) => x.questionId === q.id);
              if (!b) return null;
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
                  <p className="mt-1">
                    {b.correct
                      ? "Correct"
                      : `Incorrect. Correct answer: ${optionText(q, b.correctOptionId)}`}
                  </p>
                  {b.explanation && <p className="mt-1 opacity-90">{b.explanation}</p>}
                </div>
              );
            })}
          </div>
          <SecondaryButton className="mt-5" onClick={restart}>
            Back to quizzes
          </SecondaryButton>
        </Card>
      )}
    </div>
  );
}
