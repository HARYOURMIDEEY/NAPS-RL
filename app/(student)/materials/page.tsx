"use client";

import { useEffect, useState } from "react";
import { Card, Notice, PageHeader, Pill, Spinner, inputClass } from "@/components/ui";
import { api } from "@/lib/api-client";

type Material = {
  id: string;
  title: string;
  materialType: string;
  fileType: string;
  fileSizeBytes: number;
  downloadCount: number;
  level: number;
  course: { code: string };
};

const TYPES = ["All types", "LECTURE_NOTE", "PAST_QUESTION", "ASSIGNMENT", "SOLUTION", "STUDY_GUIDE"];
const TYPE_LABELS: Record<string, string> = {
  LECTURE_NOTE: "Lecture Note",
  PAST_QUESTION: "Past Question",
  ASSIGNMENT: "Assignment",
  SOLUTION: "Solution",
  STUDY_GUIDE: "Study Guide",
  REFERENCE: "Reference",
  OTHER: "Other",
};

function sizeLabel(bytes: number) {
  return bytes > 1024 * 1024
    ? `${(bytes / (1024 * 1024)).toFixed(1)} MB`
    : `${Math.max(1, Math.round(bytes / 1024))} KB`;
}

export default function MaterialsPage() {
  const [query, setQuery] = useState("");
  const [type, setType] = useState("All types");
  const [level, setLevel] = useState("mine");
  const [materials, setMaterials] = useState<Material[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const params = new URLSearchParams();
    if (query) params.set("q", query);
    if (type !== "All types") params.set("type", type);
    if (level !== "mine") params.set("level", level);

    let cancelled = false;
    const handle = setTimeout(() => {
      setError(null);
      api<{ materials: Material[] }>(`/api/materials?${params.toString()}`)
        .then((data) => !cancelled && setMaterials(data.materials))
        .catch((e: Error) => !cancelled && setError(e.message));
    }, 250); // light debounce on the search box

    return () => {
      cancelled = true;
      clearTimeout(handle);
    };
  }, [query, type, level]);

  return (
    <div className="mx-auto max-w-5xl space-y-6">
      <PageHeader
        title="Study Materials"
        description="Lecture notes, past questions and resources for your courses."
      />

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
        <input
          className={inputClass}
          placeholder="Search materials..."
          aria-label="Search materials"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
        />
        <select
          className={inputClass}
          aria-label="Material type"
          value={type}
          onChange={(e) => setType(e.target.value)}
        >
          {TYPES.map((t) => (
            <option key={t} value={t}>
              {t === "All types" ? t : TYPE_LABELS[t]}
            </option>
          ))}
        </select>
        <select
          className={inputClass}
          aria-label="Level"
          value={level}
          onChange={(e) => setLevel(e.target.value)}
        >
          <option value="mine">My level</option>
          {[100, 200, 300, 400, 500].map((l) => (
            <option key={l} value={l}>
              {l} Level
            </option>
          ))}
          <option value="all">All levels</option>
        </select>
      </div>

      {error && <Notice tone="error">{error}</Notice>}
      {!materials && !error && <Spinner />}

      <div className="space-y-3">
        {materials?.map((m) => (
          <Card key={m.id} className="flex items-center justify-between gap-4">
            <div className="min-w-0">
              <p className="truncate text-sm font-medium text-ink-950">{m.title}</p>
              <div className="mt-1.5 flex flex-wrap items-center gap-2">
                <Pill>{m.course.code}</Pill>
                <Pill>{TYPE_LABELS[m.materialType] ?? m.materialType}</Pill>
                <span className="text-xs text-plum-700/50">
                  {m.level} Level &middot; {m.fileType} &middot; {sizeLabel(m.fileSizeBytes)} &middot;{" "}
                  {m.downloadCount} downloads
                </span>
              </div>
            </div>
            <a
              href={`/api/materials/${m.id}/download`}
              className="shrink-0 rounded-lg border border-plum-200 px-3 py-2 text-xs font-medium text-plum-700 hover:bg-plum-50"
            >
              Download
            </a>
          </Card>
        ))}
        {materials && materials.length === 0 && (
          <Card>
            <p className="text-sm text-plum-700/70">No materials match your filters yet.</p>
          </Card>
        )}
      </div>
    </div>
  );
}
