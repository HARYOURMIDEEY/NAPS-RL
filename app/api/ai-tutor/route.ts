import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/require-user";
import { checkRateLimit } from "@/lib/rate-limit";
import { aiQuestionSchema } from "@/lib/validation";

// The AI call can take a while; give the function room on Vercel.
export const maxDuration = 60;

const DEFAULT_MODEL = "claude-sonnet-5-5";
const HISTORY_MESSAGES = 8; // last 4 exchanges are replayed for context

// RAG NOTE: retrieval is plain keyword matching on material titles — enough
// to surface related materials, not true semantic search. Swap
// `findRelatedMaterials` for an embedding lookup (e.g. pgvector) later;
// nothing else needs to change.
async function findRelatedMaterials(question: string, level: number | null) {
  const words = question
    .toLowerCase()
    .split(/\W+/)
    .filter((w) => w.length > 3)
    .slice(0, 6);
  if (words.length === 0) return [];

  return prisma.material.findMany({
    where: {
      AND: [
        level ? { level } : {},
        { OR: words.map((w) => ({ title: { contains: w, mode: "insensitive" as const } })) },
      ],
    },
    select: { id: true, title: true, materialType: true },
    take: 3,
  });
}

export async function POST(req: NextRequest) {
  const auth = await requireUser(["STUDENT"]);
  if (!auth.ok) return NextResponse.json({ error: auth.error }, { status: auth.status });

  const rl = await checkRateLimit(`ai-tutor:${auth.user.id}`, 15, 60);
  if (!rl.allowed) {
    return NextResponse.json(
      { error: "You're sending messages too quickly. Slow down a little." },
      { status: 429 }
    );
  }
  // Daily cap per student protects the API bill.
  const daily = await checkRateLimit(`ai-tutor-day:${auth.user.id}`, 100, 60 * 60 * 24);
  if (!daily.allowed) {
    return NextResponse.json(
      { error: "You've reached today's AI tutor limit. Try again tomorrow." },
      { status: 429 }
    );
  }

  const parsed = aiQuestionSchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? "Ask a question first." },
      { status: 400 }
    );
  }
  const { question, conversationId } = parsed.data;

  const apiKey = process.env.AI_API_KEY;
  if (!apiKey) {
    return NextResponse.json(
      { error: "The AI tutor isn't configured yet. Please contact an administrator." },
      { status: 503 }
    );
  }

  // A student may only continue their OWN conversation.
  let conversation = null as { id: string } | null;
  if (conversationId) {
    conversation = await prisma.aIConversation.findFirst({
      where: { id: conversationId, userId: auth.user.id },
      select: { id: true },
    });
    if (!conversation) {
      return NextResponse.json({ error: "Conversation not found." }, { status: 404 });
    }
  }

  const history: { role: "user" | "assistant"; content: string }[] = [];
  if (conversation) {
    const previous = await prisma.aIMessage.findMany({
      where: { conversationId: conversation.id },
      orderBy: [{ createdAt: "desc" }, { id: "desc" }],
      take: HISTORY_MESSAGES,
    });
    previous.reverse();
    for (const m of previous) {
      if (m.role === "user" || m.role === "assistant") {
        history.push({ role: m.role, content: m.content });
      }
    }
    while (history.length > 0 && history[0].role !== "user") history.shift();
  }

  const materials = await findRelatedMaterials(question, auth.user.level);
  const matched = materials.length > 0;

  const systemPrompt = [
    "You are the NAPS FUTMinna Physics tutor, helping Physics undergraduates at the Federal University of Technology, Minna, Nigeria.",
    auth.user.level ? `The student is in ${auth.user.level} Level.` : "",
    "Explain concepts step by step from first principles, with a short worked example where it helps. Be accurate, concise and encouraging.",
    "Write in plain text only: no LaTeX and no Markdown tables. Write equations in readable plain text, e.g. F = ma or E = (1/2)mv^2.",
    "Stay on Physics, the mathematics used in Physics, and study technique. Politely decline unrelated requests.",
    "If you are unsure of something, say so rather than guessing.",
    matched
      ? `The platform has these related study materials (you can see only their titles, not their contents). You may suggest the student look at them, but never claim to quote or summarise them:\n${materials
          .map((m) => `- ${m.title}`)
          .join("\n")}`
      : "",
  ]
    .filter(Boolean)
    .join("\n\n");

  const askedAt = new Date();
  let answer: string;
  try {
    const response = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": apiKey,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify({
        model: process.env.AI_MODEL?.trim() || DEFAULT_MODEL,
        max_tokens: 900,
        system: systemPrompt,
        messages: [...history, { role: "user", content: question }],
      }),
      signal: AbortSignal.timeout(50_000),
    });

    if (!response.ok) {
      console.error("AI provider error:", response.status, await response.text());
      return NextResponse.json(
        { error: "The AI tutor is temporarily unavailable. Try again shortly." },
        { status: 502 }
      );
    }

    const data = (await response.json()) as {
      content?: { type: string; text?: string }[];
    };
    answer =
      data.content?.find((b) => b.type === "text")?.text?.trim() ||
      "I couldn't generate a response for that. Try rephrasing your question.";
  } catch (err) {
    console.error("Failed to reach AI provider:", err);
    return NextResponse.json(
      { error: "Couldn't reach the AI tutor. Try again shortly." },
      { status: 502 }
    );
  }

  const activeConversation: { id: string } =
    conversation ??
    (await prisma.aIConversation.create({
      data: { userId: auth.user.id, title: question.slice(0, 60) },
      select: { id: true },
    }));

  // Explicit, ordered timestamps so history replays in the right order.
  await prisma.aIMessage.createMany({
    data: [
      { conversationId: activeConversation.id, role: "user", content: question, createdAt: askedAt },
      {
        conversationId: activeConversation.id,
        role: "assistant",
        content: answer,
        grounded: matched,
        usedMaterialIds: materials.map((m) => m.id),
        createdAt: new Date(Math.max(Date.now(), askedAt.getTime() + 1)),
      },
    ],
  });

  return NextResponse.json({
    conversationId: activeConversation.id,
    answer,
    grounded: matched,
    sources: materials.map((m) => ({ id: m.id, title: m.title })),
  });
}
