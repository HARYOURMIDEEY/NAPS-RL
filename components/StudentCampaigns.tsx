"use client";

import { useEffect, useState } from "react";

type Campaign = { id: string; title: string; description: string; imageUrl: string | null; ctaLabel: string | null; ctaUrl: string | null };

export default function StudentCampaigns() {
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [dismissed, setDismissed] = useState<string[]>([]);
  useEffect(() => {
    fetch("/api/campaigns/active", { cache: "no-store" })
      .then(async (r) => r.ok ? (await r.json() as { campaigns: Campaign[] }).campaigns : [])
      .then(setCampaigns).catch(() => setCampaigns([]));
  }, []);
  const visible = campaigns.filter((c) => !dismissed.includes(c.id));
  if (!visible.length) return null;
  return <section aria-label="Featured campaigns" className="mx-auto mb-6 max-w-6xl space-y-3">
    {visible.map((campaign) => <article key={campaign.id} className="relative overflow-hidden rounded-2xl border border-plum-100 bg-white shadow-sm">
      <button type="button" aria-label={`Dismiss ${campaign.title}`} onClick={() => setDismissed((old) => [...old, campaign.id])} className="absolute right-3 top-3 z-10 rounded-full bg-white/90 px-2.5 py-1 text-sm text-plum-700 shadow hover:bg-white">Dismiss ×</button>
      <div className={campaign.imageUrl ? "grid md:grid-cols-[minmax(0,1fr)_240px]" : ""}>
        <div className="p-5 pr-14 sm:p-6 sm:pr-16"><p className="text-xs font-semibold uppercase tracking-[0.16em] text-plum-500">Featured · NAPS updates</p><h2 className="mt-2 font-display text-lg font-semibold text-ink-950 sm:text-xl">{campaign.title}</h2><p className="mt-2 whitespace-pre-wrap text-sm leading-6 text-plum-700/80">{campaign.description}</p>{campaign.ctaUrl && <a href={campaign.ctaUrl} target="_blank" rel="noopener noreferrer" className="mt-4 inline-flex items-center rounded-lg bg-plum-600 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-plum-700">{campaign.ctaLabel || "Learn more"}<span aria-hidden="true" className="ml-2">↗</span></a>}</div>
        {campaign.imageUrl && <img src={campaign.imageUrl} alt="" className="max-h-48 min-h-32 w-full object-cover md:h-full md:max-h-none" />}
      </div>
    </article>)}
  </section>;
}
