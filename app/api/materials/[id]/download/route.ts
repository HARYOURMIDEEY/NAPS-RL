import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/require-user";

export const dynamic = "force-dynamic";

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  const auth = await requireUser();
  if (!auth.ok) return NextResponse.json({ error: auth.error }, { status: auth.status });

  const material = await prisma.material.findUnique({ where: { id } });
  if (!material) return NextResponse.json({ error: "Material not found." }, { status: 404 });

  // Students may open other levels' materials, so the only gate here is
  // "signed in and active" (enforced by requireUser above).
  await prisma.material.update({
    where: { id: material.id },
    data: { downloadCount: { increment: 1 } },
  });

  return NextResponse.redirect(material.fileUrl);
}
