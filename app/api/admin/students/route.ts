import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/require-user";
import { writeAuditLog } from "@/lib/audit";

export const dynamic = "force-dynamic";

export async function GET() {
  const auth = await requireUser(["ADMIN", "SUPER_ADMIN"]);
  if (!auth.ok) return NextResponse.json({ error: auth.error }, { status: auth.status });

  const students = await prisma.user.findMany({
    where: { role: "STUDENT" },
    select: {
      id: true,
      fullName: true,
      username: true,
      matricNumber: true,
      level: true,
      isActive: true,
      isSuspended: true,
      isEmailVerified: true,
      createdAt: true,
    },
    orderBy: { createdAt: "desc" },
    take: 500,
  });

  return NextResponse.json({ students });
}

const patchSchema = z.object({
  studentId: z.string().min(1),
  action: z.enum(["suspend", "reactivate"]),
});

export async function PATCH(req: NextRequest) {
  const auth = await requireUser(["ADMIN", "SUPER_ADMIN"]);
  if (!auth.ok) return NextResponse.json({ error: auth.error }, { status: auth.status });

  const parsed = patchSchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: "studentId and a valid action are required." }, { status: 400 });
  }
  const { studentId, action } = parsed.data;

  const target = await prisma.user.findUnique({ where: { id: studentId } });
  if (!target || target.role !== "STUDENT") {
    return NextResponse.json({ error: "Student not found." }, { status: 404 });
  }

  const updated = await prisma.user.update({
    where: { id: studentId },
    data: {
      isSuspended: action === "suspend",
      sessionVersion: { increment: 1 }, // force logout on suspend
    },
  });

  await writeAuditLog({
    actorId: auth.user.id,
    action: action === "suspend" ? "STUDENT_SUSPENDED" : "STUDENT_REACTIVATED",
    resource: `user:${updated.username}`,
    status: "SUCCESS",
  });

  return NextResponse.json({ success: true });
}
