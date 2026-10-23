import { NextRequest, NextResponse } from "next/server";
import type { MaterialType } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/require-user";
import { MATERIAL_TYPES } from "@/lib/validation";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const auth = await requireUser();
  if (!auth.ok) return NextResponse.json({ error: auth.error }, { status: auth.status });

  const params = req.nextUrl.searchParams;
  const query = params.get("q")?.trim();
  const courseCode = params.get("course");
  const type = params.get("type");

  // Students see their own level by default, but may browse other levels
  // (or "all") explicitly.
  const levelParam = params.get("level");
  let level: number | null | undefined;
  if (levelParam === "all") level = undefined;
  else if (levelParam && Number.isInteger(Number(levelParam))) level = Number(levelParam);
  else level = auth.user.level;

  const materialType =
    type && (MATERIAL_TYPES as readonly string[]).includes(type)
      ? (type as MaterialType)
      : undefined;

  const materials = await prisma.material.findMany({
    where: {
      ...(level ? { level } : {}),
      ...(courseCode ? { course: { code: courseCode } } : {}),
      ...(materialType ? { materialType } : {}),
      ...(query ? { title: { contains: query, mode: "insensitive" } } : {}),
    },
    include: { course: true },
    orderBy: { createdAt: "desc" },
    take: 100,
  });

  return NextResponse.json({ materials });
}
