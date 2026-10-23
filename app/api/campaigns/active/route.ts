import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/require-user";

export const dynamic = "force-dynamic";

export async function GET() {
  const auth = await requireUser(["STUDENT"]);
  if (!auth.ok) return NextResponse.json({ error: auth.error }, { status: auth.status });
  const now = new Date();
  const campaigns = await prisma.campaign.findMany({
    where: {
      isActive: true,
      startsAt: { lte: now },
      AND: [
        { OR: [{ endsAt: null }, { endsAt: { gte: now } }] },
        { OR: [{ targetLevel: null }, { targetLevel: auth.user.level ?? -1 }] },
      ],
    },
    orderBy: [{ createdAt: "desc" }],
    take: 3,
    select: { id: true, title: true, description: true, imageUrl: true, ctaLabel: true, ctaUrl: true },
  });
  return NextResponse.json({ campaigns });
}
