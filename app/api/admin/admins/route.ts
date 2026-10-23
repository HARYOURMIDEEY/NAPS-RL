import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/require-user";
import { writeAuditLog } from "@/lib/audit";

export const dynamic = "force-dynamic";

export async function GET() {
  const auth = await requireUser(["SUPER_ADMIN"]);
  if (!auth.ok) return NextResponse.json({ error: auth.error }, { status: auth.status });
  const users = await prisma.user.findMany({
    where: { role: { in: ["ADMIN", "STUDENT"] } },
    select: { id: true, fullName: true, username: true, personalEmail: true, role: true, isActive: true, isSuspended: true, createdAt: true },
    orderBy: [{ role: "asc" }, { fullName: "asc" }],
    take: 500,
  });
  return NextResponse.json({ users });
}

const changeSchema = z.object({ userId: z.string().min(1), action: z.enum(["promote", "revoke"]) });

export async function PATCH(req: NextRequest) {
  const auth = await requireUser(["SUPER_ADMIN"]);
  if (!auth.ok) return NextResponse.json({ error: auth.error }, { status: auth.status });
  const parsed = changeSchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "A user and valid action are required." }, { status: 400 });
  const { userId, action } = parsed.data;
  const target = await prisma.user.findUnique({ where: { id: userId } });
  if (!target || target.role === "SUPER_ADMIN") return NextResponse.json({ error: "That account cannot be changed here." }, { status: 404 });
  if (target.id === auth.user.id) return NextResponse.json({ error: "You cannot change your own role." }, { status: 400 });
  if (action === "promote" && target.role !== "STUDENT") return NextResponse.json({ error: "This user is already an admin." }, { status: 409 });
  if (action === "revoke" && target.role !== "ADMIN") return NextResponse.json({ error: "Only ordinary admins can be demoted here." }, { status: 409 });
  const updated = await prisma.user.update({
    where: { id: target.id },
    data: { role: action === "promote" ? "ADMIN" : "STUDENT", sessionVersion: { increment: 1 } },
  });
  await writeAuditLog({ actorId: auth.user.id, action: action === "promote" ? "ADMIN_PROMOTED" : "ADMIN_REVOKED", resource: `user:${updated.username}`, status: "SUCCESS" });
  return NextResponse.json({ success: true });
}
