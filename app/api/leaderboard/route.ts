import { NextRequest, NextResponse } from "next/server";
import { requireUser } from "@/lib/require-user";
import { computeLeaderboard, parsePeriod } from "@/lib/scoring";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const auth = await requireUser(["STUDENT"]);
  if (!auth.ok) return NextResponse.json({ error: auth.error }, { status: auth.status });

  const period = parsePeriod(req.nextUrl.searchParams.get("period"));
  const rows = await computeLeaderboard(period);
  const you = rows.find((r) => r.id === auth.user.id) ?? null;

  return NextResponse.json({ period, leaderboard: rows.slice(0, 50), you });
}
