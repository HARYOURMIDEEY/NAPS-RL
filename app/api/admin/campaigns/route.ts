import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/require-user";
import { writeAuditLog } from "@/lib/audit";
import { deleteUploadedFile, isTrustedBlobUrl } from "@/lib/storage";

export const dynamic = "force-dynamic";

const campaignSchema = z.object({
  title: z.string().trim().min(3).max(100),
  description: z.string().trim().min(5).max(1200),
  imageUrl: z.string().url().optional().or(z.literal("")),
  ctaLabel: z.string().trim().max(40).optional().or(z.literal("")),
  ctaUrl: z.string().url().max(2048).optional().or(z.literal("")),
  targetLevel: z.number().int().refine((n) => [100, 200, 300, 400, 500].includes(n)).nullable().optional(),
  startsAt: z.string().datetime().optional(),
  endsAt: z.string().datetime().nullable().optional(),
  isActive: z.boolean().optional(),
});

export async function GET() {
  const auth = await requireUser(["SUPER_ADMIN"]);
  if (!auth.ok) return NextResponse.json({ error: auth.error }, { status: auth.status });
  const campaigns = await prisma.campaign.findMany({ orderBy: [{ createdAt: "desc" }] });
  return NextResponse.json({ campaigns });
}

export async function POST(req: NextRequest) {
  const auth = await requireUser(["SUPER_ADMIN"]);
  if (!auth.ok) return NextResponse.json({ error: auth.error }, { status: auth.status });
  const parsed = campaignSchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Invalid campaign." }, { status: 400 });
  const data = parsed.data;
  const startsAt = data.startsAt ? new Date(data.startsAt) : new Date();
  const endsAt = data.endsAt ? new Date(data.endsAt) : null;
  if (endsAt && endsAt <= startsAt) return NextResponse.json({ error: "Campaign end must be after its start." }, { status: 400 });
  if (data.ctaUrl) {
    try {
      const url = new URL(data.ctaUrl);
      if (url.protocol !== "https:" && url.protocol !== "http:") throw new Error();
    } catch { return NextResponse.json({ error: "Call-to-action link must be a valid http or https URL." }, { status: 400 }); }
  }
  if (data.imageUrl) {
    try {
      const url = new URL(data.imageUrl);
      if (url.protocol !== "https:" || !url.hostname.endsWith(".public.blob.vercel-storage.com")) throw new Error();
    } catch { return NextResponse.json({ error: "Campaign image must be uploaded to the configured Vercel Blob store." }, { status: 400 }); }
  }
  const campaign = await prisma.campaign.create({
    data: {
      title: data.title, description: data.description, imageUrl: data.imageUrl || null,
      ctaLabel: data.ctaLabel || null, ctaUrl: data.ctaUrl || null,
      targetLevel: data.targetLevel ?? null, startsAt, endsAt, isActive: data.isActive ?? true,
      createdById: auth.user.id,
    },
  });
  await writeAuditLog({ actorId: auth.user.id, action: "CAMPAIGN_CREATED", resource: `campaign:${campaign.id}`, status: "SUCCESS" });
  return NextResponse.json({ campaign }, { status: 201 });
}

export async function PATCH(req: NextRequest) {
  const auth = await requireUser(["SUPER_ADMIN"]);
  if (!auth.ok) return NextResponse.json({ error: auth.error }, { status: auth.status });
  const body = await req.json().catch(() => null) as { id?: unknown; isActive?: unknown } | null;
  if (!body || typeof body.id !== "string" || typeof body.isActive !== "boolean") {
    return NextResponse.json({ error: "Campaign id and active status are required." }, { status: 400 });
  }
  const existing = await prisma.campaign.findUnique({ where: { id: body.id } });
  if (!existing) return NextResponse.json({ error: "Campaign not found." }, { status: 404 });
  const campaign = await prisma.campaign.update({ where: { id: body.id }, data: { isActive: body.isActive } });
  await writeAuditLog({ actorId: auth.user.id, action: body.isActive ? "CAMPAIGN_ACTIVATED" : "CAMPAIGN_PAUSED", resource: `campaign:${campaign.id}`, status: "SUCCESS" });
  return NextResponse.json({ campaign });
}

export async function DELETE(req: NextRequest) {
  const auth = await requireUser(["SUPER_ADMIN"]);
  if (!auth.ok) return NextResponse.json({ error: auth.error }, { status: auth.status });
  const id = new URL(req.url).searchParams.get("id");
  if (!id) return NextResponse.json({ error: "Campaign id is required." }, { status: 400 });
  const existing = await prisma.campaign.findUnique({ where: { id } });
  if (!existing) return NextResponse.json({ error: "Campaign not found." }, { status: 404 });
  await prisma.campaign.delete({ where: { id } });
  if (existing.imageUrl && isTrustedBlobUrl(existing.imageUrl)) await deleteUploadedFile(existing.imageUrl);
  await writeAuditLog({ actorId: auth.user.id, action: "CAMPAIGN_DELETED", resource: `campaign:${id}`, status: "SUCCESS" });
  return NextResponse.json({ success: true });
}
