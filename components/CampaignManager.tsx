"use client";

import { useEffect, useState } from "react";
import { upload } from "@vercel/blob/client";
import { Card, Field, Notice, PageHeader, Pill, PrimaryButton, Spinner, inputClass } from "@/components/ui";
import { api } from "@/lib/api-client";

type Campaign = { id: string; title: string; description: string; imageUrl: string | null; ctaLabel: string | null; ctaUrl: string | null; targetLevel: number | null; isActive: boolean; startsAt: string; endsAt: string | null; createdAt: string };
const MAX_IMAGE_MB = 5;

export default function CampaignManager() {
  const [campaigns, setCampaigns] = useState<Campaign[] | null>(null);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [ctaLabel, setCtaLabel] = useState("Learn more");
  const [ctaUrl, setCtaUrl] = useState("");
  const [targetLevel, setTargetLevel] = useState("all");
  const [startsAt, setStartsAt] = useState("");
  const [endsAt, setEndsAt] = useState("");
  const [image, setImage] = useState<File | null>(null);
  const [fileKey, setFileKey] = useState(0);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<{ tone: "success" | "error"; text: string } | null>(null);

  async function load() {
    try { const data = await api<{ campaigns: Campaign[] }>("/api/admin/campaigns"); setCampaigns(data.campaigns); }
    catch (e) { setError((e as Error).message); }
  }
  useEffect(() => { void load(); }, []);

  async function submit(e: React.FormEvent) {
    e.preventDefault(); setError(null); setNotice(null); setSubmitting(true);
    try {
      let imageUrl = "";
      if (image) {
        if (!image.type.startsWith("image/")) throw new Error("Choose an image file.");
        if (image.size > MAX_IMAGE_MB * 1024 * 1024) throw new Error(`Image must be ${MAX_IMAGE_MB} MB or smaller.`);
        const safeName = image.name.replace(/[^a-zA-Z0-9._-]+/g, "_");
        const blob = await upload(`campaigns/${crypto.randomUUID()}-${safeName}`, image, {
          access: "public", handleUploadUrl: "/api/admin/materials/upload",
        });
        imageUrl = blob.url;
      }
      await api("/api/admin/campaigns", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({
        title, description, imageUrl, ctaLabel, ctaUrl, targetLevel: targetLevel === "all" ? null : Number(targetLevel),
        startsAt: startsAt ? new Date(startsAt).toISOString() : undefined,
        endsAt: endsAt ? new Date(endsAt).toISOString() : null, isActive: true,
      }) });
      setNotice({ tone: "success", text: "Campaign published to the selected student audience." });
      setTitle(""); setDescription(""); setCtaUrl(""); setCtaLabel("Learn more"); setTargetLevel("all"); setStartsAt(""); setEndsAt(""); setImage(null); setFileKey((n) => n + 1);
      await load();
    } catch (e) { setNotice({ tone: "error", text: (e as Error).message || "Could not save campaign." }); }
    finally { setSubmitting(false); }
  }

  async function toggle(c: Campaign) {
    try { await api("/api/admin/campaigns", { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id: c.id, isActive: !c.isActive }) }); await load(); }
    catch (e) { setError((e as Error).message); }
  }
  async function remove(c: Campaign) {
    if (!window.confirm(`Delete campaign “${c.title}”?`)) return;
    try { await api(`/api/admin/campaigns?id=${encodeURIComponent(c.id)}`, { method: "DELETE" }); await load(); }
    catch (e) { setError((e as Error).message); }
  }

  return <div className="mx-auto max-w-5xl space-y-6">
    <PageHeader title="Ads & campaigns" description="Create announcements, promotions and campaigns that appear in the student experience. Only the Super Admin can manage campaigns." />
    <Card>
      <h2 className="mb-1 font-display text-lg font-semibold text-ink-950">Create a campaign</h2>
      <p className="mb-5 text-sm text-plum-700/70">Use a clear message, optional banner image and a destination link. You can target everyone or a specific academic level.</p>
      <form onSubmit={submit} className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <Field label="Campaign title"><input required minLength={3} maxLength={100} className={inputClass} value={title} onChange={(e) => setTitle(e.target.value)} placeholder="e.g. Departmental seminar" /></Field>
        <Field label="Audience"><select className={inputClass} value={targetLevel} onChange={(e) => setTargetLevel(e.target.value)}><option value="all">All students</option>{[100,200,300,400,500].map((level) => <option key={level} value={level}>{level} Level</option>)}</select></Field>
        <div className="sm:col-span-2"><Field label="Description"><textarea required minLength={5} maxLength={1200} rows={3} className={inputClass} value={description} onChange={(e) => setDescription(e.target.value)} placeholder="What should students know?" /></Field></div>
        <Field label="Banner image (optional, JPG/PNG/WebP/GIF, max 5 MB)"><input key={fileKey} type="file" accept="image/jpeg,image/png,image/webp,image/gif" className={inputClass} onChange={(e) => setImage(e.target.files?.[0] ?? null)} /></Field>
        <Field label="Button label (optional)"><input maxLength={40} className={inputClass} value={ctaLabel} onChange={(e) => setCtaLabel(e.target.value)} placeholder="Learn more" /></Field>
        <Field label="Button destination URL (optional)"><input type="url" className={inputClass} value={ctaUrl} onChange={(e) => setCtaUrl(e.target.value)} placeholder="https://example.com" /></Field>
        <Field label="Start date/time (optional)"><input type="datetime-local" className={inputClass} value={startsAt} onChange={(e) => setStartsAt(e.target.value)} /></Field>
        <Field label="End date/time (optional)"><input type="datetime-local" className={inputClass} value={endsAt} onChange={(e) => setEndsAt(e.target.value)} /></Field>
        <div className="flex flex-wrap items-center gap-3 sm:col-span-2"><PrimaryButton type="submit" disabled={submitting}>{submitting ? "Publishing…" : "Publish campaign"}</PrimaryButton>{notice && <Notice tone={notice.tone}>{notice.text}</Notice>}</div>
      </form>
    </Card>
    {error && <Notice tone="error">{error}</Notice>}
    <div className="space-y-3"><div className="flex items-center justify-between"><h2 className="font-display text-lg font-semibold text-ink-950">Campaign library</h2><Pill>{campaigns?.length ?? 0} total</Pill></div>
      {!campaigns && !error && <Spinner />}
      {campaigns?.length === 0 && <Card><p className="text-sm text-plum-700/70">No campaigns yet. Create one above to display it to students.</p></Card>}
      {campaigns?.map((c) => <Card key={c.id} className="flex flex-col gap-4 sm:flex-row sm:items-start">
        {c.imageUrl && <img src={c.imageUrl} alt="" className="h-28 w-full rounded-lg object-cover sm:w-40" />}
        <div className="min-w-0 flex-1"><div className="flex flex-wrap items-center gap-2"><h3 className="font-semibold text-ink-950">{c.title}</h3><Pill>{c.isActive ? "Active" : "Paused"}</Pill><Pill>{c.targetLevel ? `${c.targetLevel} Level` : "All students"}</Pill></div><p className="mt-2 whitespace-pre-wrap text-sm text-plum-700/80">{c.description}</p><p className="mt-2 text-xs text-plum-700/50">Starts {new Date(c.startsAt).toLocaleString()}</p></div>
        <div className="flex shrink-0 gap-3"><button onClick={() => void toggle(c)} className="text-sm font-medium text-plum-600 hover:underline">{c.isActive ? "Pause" : "Activate"}</button><button onClick={() => void remove(c)} className="text-sm font-medium text-red-600 hover:underline">Delete</button></div>
      </Card>)}
    </div>
  </div>;
}
