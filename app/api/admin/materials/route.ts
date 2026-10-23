import { NextRequest, NextResponse } from "next/server";
import path from "path";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/require-user";
import { writeAuditLog } from "@/lib/audit";
import { deleteUploadedFile, isTrustedBlobUrl, MAX_UPLOAD_BYTES } from "@/lib/storage";
import { materialCreateSchema } from "@/lib/validation";

export const dynamic = "force-dynamic";

export async function GET() {
  const auth = await requireUser(["ADMIN", "SUPER_ADMIN"]);
  if (!auth.ok) return NextResponse.json({ error: auth.error }, { status: auth.status });

  const [materials, courses] = await Promise.all([
    prisma.material.findMany({
      include: { course: true },
      orderBy: { createdAt: "desc" },
      take: 300,
    }),
    prisma.course.findMany({ orderBy: { code: "asc" } }),
  ]);

  return NextResponse.json({ materials, courses });
}

/** Called AFTER the browser has uploaded the file straight to Vercel Blob. */
export async function POST(req: NextRequest) {
  const auth = await requireUser(["ADMIN", "SUPER_ADMIN"]);
  if (!auth.ok) return NextResponse.json({ error: auth.error }, { status: auth.status });

  const parsed = materialCreateSchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? "Missing required fields." },
      { status: 400 }
    );
  }
  const data = parsed.data;

  if (!isTrustedBlobUrl(data.fileUrl)) {
    return NextResponse.json({ error: "Invalid file location." }, { status: 400 });
  }
  if (data.fileSizeBytes > MAX_UPLOAD_BYTES) {
    return NextResponse.json({ error: "File is too large." }, { status: 400 });
  }

  const course = await prisma.course.findUnique({ where: { code: data.courseCode } });
  if (!course) return NextResponse.json({ error: "Unknown course code." }, { status: 400 });

  const ext = path.extname(data.fileName).replace(".", "").toUpperCase();

  const material = await prisma.material.create({
    data: {
      title: data.title,
      level: data.level,
      courseId: course.id,
      materialType: data.materialType,
      fileUrl: data.fileUrl,
      fileType: ext || "FILE",
      fileSizeBytes: data.fileSizeBytes,
      uploadedById: auth.user.id,
    },
  });

  await writeAuditLog({
    actorId: auth.user.id,
    action: "MATERIAL_UPLOADED",
    resource: `material:${material.id}`,
    status: "SUCCESS",
    metadata: { title: data.title, courseCode: data.courseCode },
  });

  return NextResponse.json({ material }, { status: 201 });
}

export async function DELETE(req: NextRequest) {
  const auth = await requireUser(["ADMIN", "SUPER_ADMIN"]);
  if (!auth.ok) return NextResponse.json({ error: auth.error }, { status: auth.status });

  const id = req.nextUrl.searchParams.get("id");
  if (!id) return NextResponse.json({ error: "Material id is required." }, { status: 400 });

  const material = await prisma.material.findUnique({ where: { id } });
  if (!material) return NextResponse.json({ error: "Material not found." }, { status: 404 });

  await prisma.material.delete({ where: { id } });
  await deleteUploadedFile(material.fileUrl);

  await writeAuditLog({
    actorId: auth.user.id,
    action: "MATERIAL_DELETED",
    resource: `material:${id}`,
    status: "SUCCESS",
    metadata: { title: material.title },
  });

  return NextResponse.json({ success: true });
}
