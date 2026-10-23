"use client";

import { useEffect, useMemo, useState } from "react";
import { Card, Notice, PageHeader, Pill, Spinner, inputClass } from "@/components/ui";
import { api } from "@/lib/api-client";

type ManagedUser = { id: string; fullName: string; username: string; personalEmail: string; role: "STUDENT" | "ADMIN"; isActive: boolean; isSuspended: boolean; createdAt: string };

export default function AdminManagementPage() {
  const [users, setUsers] = useState<ManagedUser[] | null>(null);
  const [search, setSearch] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState<string | null>(null);
  async function load() {
    try { const data = await api<{ users: ManagedUser[] }>("/api/admin/admins"); setUsers(data.users); }
    catch (e) { setError((e as Error).message); }
  }
  useEffect(() => { void load(); }, []);
  async function changeRole(user: ManagedUser) {
    const action = user.role === "ADMIN" ? "revoke" : "promote";
    const verb = action === "promote" ? "promote to Admin" : "remove Admin access from";
    if (!window.confirm(`Are you sure you want to ${verb} ${user.fullName}?`)) return;
    setBusy(user.id); setError(null);
    try {
      await api("/api/admin/admins", { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ userId: user.id, action }) });
      await load();
    } catch (e) { setError((e as Error).message); }
    finally { setBusy(null); }
  }
  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return (users ?? []).filter(u => !q || [u.fullName, u.username, u.personalEmail].some(v => v.toLowerCase().includes(q)));
  }, [users, search]);
  return <div className="mx-auto max-w-5xl space-y-6">
    <PageHeader title="Admin Management" description="Promote registered users to Admin or revoke ordinary Admin access. Super Admin accounts cannot be changed here." />
    <input className={inputClass} placeholder="Search name, username, or email…" aria-label="Search users" value={search} onChange={e => setSearch(e.target.value)} />
    {error && <Notice tone="error">{error}</Notice>}
    {!users && !error && <Spinner label="Loading accounts…" />}
    {users && filtered.length === 0 && <Card><p className="text-sm text-plum-700/70">No matching accounts found.</p></Card>}
    {users && filtered.length > 0 && <Card className="overflow-x-auto p-0"><table className="w-full min-w-[650px] text-sm"><thead><tr className="border-b border-plum-100 text-left text-xs uppercase text-plum-700/50"><th className="px-4 py-3">Name / email</th><th className="px-4 py-3">Username</th><th className="px-4 py-3">Role</th><th className="px-4 py-3">Status</th><th className="px-4 py-3">Action</th></tr></thead><tbody>{filtered.map(u => <tr key={u.id} className="border-b border-plum-50 last:border-0"><td className="px-4 py-3 text-ink-950">{u.fullName}<span className="block text-xs text-plum-700/60">{u.personalEmail}</span></td><td className="px-4 py-3">@{u.username}</td><td className="px-4 py-3"><Pill>{u.role === "ADMIN" ? "Admin" : "Student"}</Pill></td><td className="px-4 py-3"><Pill tone={u.isSuspended || !u.isActive ? "danger" : "default"}>{u.isSuspended ? "Suspended" : u.isActive ? "Active" : "Inactive"}</Pill></td><td className="px-4 py-3"><button disabled={busy === u.id || !u.isActive || u.isSuspended} onClick={() => void changeRole(u)} className="text-xs font-semibold text-plum-600 hover:underline disabled:opacity-50">{busy === u.id ? "Saving…" : u.role === "ADMIN" ? "Revoke Admin" : "Make Admin"}</button></td></tr>)}</tbody></table></Card>}
    <p className="text-xs text-plum-700/60">Only the Super Admin can access this page. Role changes invalidate the user's current session, so they must sign in again.</p>
  </div>;
}
