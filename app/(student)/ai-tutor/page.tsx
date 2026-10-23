"use client";

import { useEffect, useRef, useState } from "react";
import { Card, Notice, PageHeader, Pill, PrimaryButton, SecondaryButton, inputClass } from "@/components/ui";
import { postJson } from "@/lib/api-client";

type Source = { id: string; title: string };
type Message = { role: "user" | "assistant"; content: string; grounded?: boolean; sources?: Source[] };
type TutorResponse = { conversationId: string; answer: string; grounded: boolean; sources: Source[] };

const SUGGESTED = [
  "Explain conservation of angular momentum",
  "Walk me through deriving the Lagrangian of a simple pendulum",
  "What does Gauss's law say, in plain words?",
  "Help me revise thermodynamics: the first and second laws",
];

export default function AiTutorPage() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [conversationId, setConversationId] = useState<string | undefined>();
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const bottomRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
  }, [messages, sending]);

  async function send(text: string) {
    const question = text.trim();
    if (!question || sending) return;
    setError(null);
    setMessages((m) => [...m, { role: "user", content: question }]);
    setInput("");
    setSending(true);
    try {
      const data = await postJson<TutorResponse>("/api/ai-tutor", { question, conversationId });
      setConversationId(data.conversationId);
      setMessages((m) => [
        ...m,
        { role: "assistant", content: data.answer, grounded: data.grounded, sources: data.sources },
      ]);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setSending(false);
    }
  }

  function newChat() {
    setMessages([]);
    setConversationId(undefined);
    setError(null);
  }

  return (
    <div className="mx-auto flex h-[calc(100dvh-8.5rem)] max-w-3xl flex-col md:h-[calc(100dvh-4rem)]">
      <div className="mb-4 flex items-start justify-between gap-4">
        <PageHeader title="AI Physics Tutor" description="Ask about a concept, a formula, or a problem you're stuck on." />
        {messages.length > 0 && (
          <SecondaryButton onClick={newChat} className="shrink-0 !px-3 !py-2 text-xs">
            New chat
          </SecondaryButton>
        )}
      </div>

      {messages.length === 0 && (
        <div className="mb-4 grid grid-cols-1 gap-2 sm:grid-cols-2">
          {SUGGESTED.map((s) => (
            <button
              key={s}
              onClick={() => send(s)}
              className="rounded-lg border border-plum-200 bg-white px-3.5 py-2.5 text-left text-sm text-plum-700 hover:bg-plum-50"
            >
              {s}
            </button>
          ))}
        </div>
      )}

      <div className="flex-1 space-y-3 overflow-y-auto pr-1" aria-live="polite">
        {messages.map((m, i) => (
          <div key={i} className={`flex ${m.role === "user" ? "justify-end" : "justify-start"}`}>
            <div
              className={`max-w-[88%] whitespace-pre-wrap break-words rounded-xl px-4 py-2.5 text-sm leading-relaxed ${
                m.role === "user" ? "bg-plum-500 text-white" : "border border-plum-100 bg-white text-ink-950"
              }`}
            >
              {m.content}
              {m.role === "assistant" && m.grounded && m.sources && m.sources.length > 0 && (
                <div className="mt-3 border-t border-plum-100 pt-2">
                  <Pill tone="gold">Related materials on the platform</Pill>
                  <ul className="mt-1.5 list-disc pl-5 text-xs text-plum-700/80">
                    {m.sources.map((s) => (
                      <li key={s.id}>
                        <a href={`/api/materials/${s.id}/download`} className="underline">
                          {s.title}
                        </a>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          </div>
        ))}
        {sending && <p className="text-xs text-plum-700/50">Thinking...</p>}
        {error && <Notice tone="error">{error}</Notice>}
        <div ref={bottomRef} />
      </div>

      <Card className="mt-4">
        <form
          onSubmit={(e) => {
            e.preventDefault();
            void send(input);
          }}
          className="flex gap-2"
        >
          <input
            className={inputClass}
            placeholder="Ask the AI tutor..."
            aria-label="Your question"
            maxLength={2000}
            value={input}
            onChange={(e) => setInput(e.target.value)}
          />
          <PrimaryButton type="submit" disabled={sending || !input.trim()}>
            Send
          </PrimaryButton>
        </form>
        <p className="mt-2 text-[11px] text-plum-700/50">
          The tutor can make mistakes. Check important results against your lecture notes.
        </p>
      </Card>
    </div>
  );
}
