import { NextResponse } from "next/server";
import { requireUser } from "@/lib/require-user";

export const dynamic = "force-dynamic";

export async function GET() {
  const auth = await requireUser(undefined, { allowPendingPasswordChange: true });
  if (!auth.ok) return NextResponse.json({ error: auth.error }, { status: auth.status });

  const { id, fullName, username, role, level, mustChangePassword } = auth.user;
  return NextResponse.json({ id, fullName, username, role, level, mustChangePassword });
}
