"use client";

import { useEffect, useState } from "react";
import { upload } from "@vercel/blob/client";
import { Card, Field, Notice, PageHeader, Pill, PrimaryButton, Spinner, inputClass } from "@/components/ui";
import { api } from "@/lib/api-client";

type Material = {
  id: string;
  title: string;
  materialType: string;
  downloadCount: number;
  level: number;
  fileSizeBytes: number;
  course: { code: string };
};
type Course = { id: string; code: string; title: string; level: number };

const MAX_MB = 50;

export default function AdminMaterialsPage() {
  const [materials, setMaterials] = useState<Material[] | null>(null);
  const [courses, setCourses] = useState<Course[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [title, setTitle] = useState("");
  const [courseCode, setCourseCode] = useState("");
  const [materialType, setMaterialType] = useState("LECTURE_NOTE");
  const [level, setLevel] = useState(300);
  const [file, setFile] = useState<File | null>(null);
  const [fileKey, setFileKey] = useState(0); // resets the file input after upload
  const [submitting, setSubmitting] = useState(false);
  const [notice, setNotice] = useState<{ tone: "success" | "error"; text: string } | null>(null);

  async function load() {
    try {
      const data = await api<{ materials: Material[]; courses: Course[] }>("/api/admin/materials");
      setMaterials(data.materials);
      setCourses(data.courses);
      setCourseCode((current) => current || data.courses[0]?.code || "");
    } catch (e) {
      setError((e as Error).message);
    }
  }

  useEffect(() => {
    void load();
  }, []);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setNotice(null);
    if (!file) {
      setNotice({ tone: "error", text: "Choose a file first." });
      return;
    }
    if (file.size > MAX_MB * 1024 * 1024) {
      setNotice({ tone: "error", text: `That file is larger than ${MAX_MB} MB.` });
      return;
    }
    if (!courseCode) {
      setNotice({ tone: "error", text: "Add a course first (see README: seeding)." });
      return;
    }

    setSubmitting(true);
    try {
      // 1. Browser uploads straight to Vercel Blob (no 4.5 MB serverless limit).
      const safeName = file.name.replace(/[^a-zA-Z0-9._-]+/g, "_");
      const blob = await upload(`materials/${crypto.randomUUID()}-${safeName}`, file, {
        access: "public",
        handleUploadUrl: "/api/admin/materials/upload",
      });

      // 2. Save the record.
      await api("/api/admin/materials", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title,
          courseCode,
          materialType,
          level,
          fileUrl: blob.url,
          fileName: file.name,
          fileSizeBytes: file.size,
        }),
      });

      setNotice({ tone: "success", text: "Uploaded successfully." });
      setTitle("");
      setFile(null);
      setFileKey((k) => k + 1);
      await load();
    } catch (err) {
      setNotice({ tone: "error", text: (err as Error).message || "Upload failed." });
    } finally {
      setSubmitting(false);
    }
  }

  async function handleDelete(m: Material) {
    if (!window.confirm(`Delete "${m.title}"? This also removes the file and can't be undone.`)) return;
    try {
      await api(`/api/admin/materials?id=${encodeURIComponent(m.id)}`, { method: "DELETE" });
      await load();
    } catch (err) {
      setError((err as Error).message);
    }
  }

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <PageHeader
        title="Materials"
        description="Upload and organise academic resources by level and course."
      />

      <Card>
        <h2 className="mb-4 font-display text-lg font-semibold text-ink-950">Upload new material</h2>
        <form onSubmit={handleSubmit} className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <Field label="Title">
            <input required minLength={3} className={inputClass} value={title} onChange={(e) => setTitle(e.target.value)} />
          </Field>
          <Field label="Course">
            <select className={inputClass} value={courseCode} onChange={(e) => setCourseCode(e.target.value)}>
              {courses.map((c) => (
                <option key={c.id} value={c.code}>
                  {c.code} &mdash; {c.title}
                </option>
              ))}
            </select>
          </Field>
          <Field label="Material type">
            <select className={inputClass} value={materialType} onChange={(e) => setMaterialType(e.target.value)}>
              <option value="LECTURE_NOTE">Lecture Note</option>
              <option value="PAST_QUESTION">Past Question</option>
              <option value="ASSIGNMENT">Assignment</option>
              <option value="SOLUTION">Solution</option>
              <option value="STUDY_GUIDE">Study Guide</option>
              <option value="REFERENCE">Reference</option>
              <option value="OTHER">Other</option>
            </select>
          </Field>
          <Field label="Level">
            <select className={inputClass} value={level} onChange={(e) => setLevel(Number(e.target.value))}>
              {[100, 200, 300, 400, 500].map((l) => (
                <option key={l} value={l}>
                  {l} Level
                </option>
              ))}
            </select>
          </Field>
          <Field label={`File (PDF, Word, PowerPoint, Excel, image, up to ${MAX_MB} MB)`}>
            <input
              key={fileKey}
              type="file"
              required
              className={inputClass}
              accept=".pdf,.doc,.docx,.ppt,.pptx,.xls,.xlsx,.txt,.png,.jpg,.jpeg,.zip"
              onChange={(e) => setFile(e.target.files?.[0] ?? null)}
            />
          </Field>
          <div className="flex flex-wrap items-center gap-3 sm:col-span-2">
            <PrimaryButton type="submit" disabled={submitting}>
              {submitting ? "Uploading..." : "Upload material"}
            </PrimaryButton>
            {notice && <Notice tone={notice.tone}>{notice.text}</Notice>}
          </div>
        </form>
      </Card>

      {error && <Notice tone="error">{error}</Notice>}
      {!materials && !error && <Spinner />}

      {materials && materials.length === 0 && (
        <Card>
          <p className="text-sm text-plum-700/70">No materials uploaded yet.</p>
        </Card>
      )}

      {materials && materials.length > 0 && (
        <Card className="overflow-x-auto p-0">
          <table className="w-full min-w-[560px] text-sm">
            <thead>
              <tr className="border-b border-plum-100 text-left text-xs uppercase text-plum-700/50">
                <th className="px-4 py-3 font-medium">Title</th>
                <th className="px-4 py-3 font-medium">Course</th>
                <th className="px-4 py-3 font-medium">Level</th>
                <th className="px-4 py-3 font-medium">Downloads</th>
                <th className="px-4 py-3 font-medium"></th>
              </tr>
            </thead>
            <tbody>
              {materials.map((m) => (
                <tr key={m.id} className="border-b border-plum-50 last:border-0">
                  <td className="px-4 py-3 text-ink-950">{m.title}</td>
                  <td className="px-4 py-3">
                    <Pill>{m.course.code}</Pill>
                  </td>
                  <td className="px-4 py-3 text-plum-700/70">{m.level}</td>
                  <td className="px-4 py-3 text-plum-700/70">{m.downloadCount}</td>
                  <td className="px-4 py-3 text-right">
                    <button onClick={() => handleDelete(m)} className="text-xs font-medium text-red-600 hover:underline">
                      Delete
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </Card>
      )}
    </div>
  );
}
