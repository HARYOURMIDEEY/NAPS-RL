"use client";

import { useEffect, useMemo, useState } from "react";
import { Card, Notice, PageHeader, Pill, Spinner, inputClass } from "@/components/ui";
import { api } from "@/lib/api-client";

type Student = {
  id: string;
  fullName: string;
  username: string;
  matricNumber: string | null;
  level: number | null;
  isActive: boolean;
  isSuspended: boolean;
  isEmailVerified: boolean;
};

function statusFor(s: Student): { label: string; tone: "default" | "gold" | "danger" } {
  if (s.isSuspended) return { label: "Suspended", tone: "danger" };
  return { label: "Active", tone: "default" };
}

export default function AdminStudentsPage() {
  const [students, setStudents] = useState<Student[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [search, setSearch] = useState("");

  async function load() {
    try {
      const data = await api<{ students: Student[] }>("/api/admin/students");
      setStudents(data.students);
    } catch (e) {
      setError((e as Error).message);
    }
  }

  useEffect(() => {
    void load();
  }, []);

  async function toggleSuspend(student: Student) {
    const action = student.isSuspended ? "reactivate" : "suspend";
    if (action === "suspend" && !window.confirm(`Suspend ${student.fullName}? They will be signed out immediately.`)) {
      return;
    }
    setBusyId(student.id);
    setError(null);
    try {
      await api("/api/admin/students", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ studentId: student.id, action }),
      });
      await load();
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusyId(null);
    }
  }

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!students) return null;
    if (!q) return students;
    return students.filter(
      (s) =>
        s.fullName.toLowerCase().includes(q) ||
        s.username.toLowerCase().includes(q) ||
        (s.matricNumber ?? "").toLowerCase().includes(q)
    );
  }, [students, search]);

  return (
    <div className="mx-auto max-w-5xl space-y-6">
      <PageHeader title="Students" description="Manage student accounts and suspensions." />

      <input
        className={inputClass}
        placeholder="Search by name, username or matric number..."
        aria-label="Search students"
        value={search}
        onChange={(e) => setSearch(e.target.value)}
      />

      {error && <Notice tone="error">{error}</Notice>}
      {!students && !error && <Spinner label="Loading students..." />}

      {filtered && filtered.length === 0 && (
        <Card>
          <p className="text-sm text-plum-700/70">
            {students && students.length > 0 ? "No students match your search." : "No students have registered yet."}
          </p>
        </Card>
      )}

      {filtered && filtered.length > 0 && (
        <Card className="overflow-x-auto p-0">
          <table className="w-full min-w-[560px] text-sm">
            <thead>
              <tr className="border-b border-plum-100 text-left text-xs uppercase text-plum-700/50">
                <th className="px-4 py-3 font-medium">Name</th>
                <th className="px-4 py-3 font-medium">Username</th>
                <th className="px-4 py-3 font-medium">Level</th>
                <th className="px-4 py-3 font-medium">Status</th>
                <th className="px-4 py-3 font-medium">Actions</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((s) => {
                const status = statusFor(s);
                return (
                  <tr key={s.id} className="border-b border-plum-50 last:border-0">
                    <td className="px-4 py-3 text-ink-950">
                      {s.fullName}
                      {s.matricNumber && <span className="block text-xs text-plum-700/50">{s.matricNumber}</span>}
                    </td>
                    <td className="px-4 py-3 text-plum-700/70">@{s.username}</td>
                    <td className="px-4 py-3 text-plum-700/70">{s.level ?? "-"}</td>
                    <td className="px-4 py-3">
                      <Pill tone={status.tone}>{status.label}</Pill>
                    </td>
                    <td className="px-4 py-3">
                      <button
                        disabled={busyId === s.id}
                        onClick={() => toggleSuspend(s)}
                        className="text-xs font-medium text-plum-600 hover:underline disabled:opacity-50"
                      >
                        {s.isSuspended ? "Reactivate" : "Suspend"}
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </Card>
      )}
    </div>
  );
}
