"use client";

import Link from "next/link";
import { useRouter, usePathname } from "next/navigation";
import { ReactNode, useEffect, useState } from "react";
import { Icon } from "@/components/icons";

const NAV = [
  { href: "/admin", label: "Analytics", icon: "chart" },
  { href: "/admin/students", label: "Students", icon: "users" },
  { href: "/admin/admins", label: "Admin Management", icon: "users", superAdminOnly: true },
  { href: "/admin/materials", label: "Materials", icon: "file" },
  { href: "/admin/campaigns", label: "Ads & campaigns", icon: "megaphone", superAdminOnly: true },
] as const;

type MeResponse = {
  fullName: string;
  username: string;
  role: "ADMIN" | "SUPER_ADMIN";
  mustChangePassword?: boolean;
};

export default function AdminShell({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const [me, setMe] = useState<MeResponse | null>(null);

  useEffect(() => {
    fetch("/api/me", { cache: "no-store" })
      .then(async (r) => {
        if (r.status === 401) {
          router.replace("/admin/login");
          return null;
        }
        return r.ok ? ((await r.json()) as MeResponse) : null;
      })
      .then((data) => {
        if (data?.mustChangePassword) router.replace("/settings/change-password?forced=1");
        setMe(data);
      })
      .catch(() => setMe(null));
  }, [router]);

  async function handleLogout() {
    await fetch("/api/auth/logout", { method: "POST" });
    router.push("/admin/login");
    router.refresh();
  }

  const isActive = (href: string) =>
    href === "/admin" ? pathname === "/admin" : pathname?.startsWith(href);

  return (
    <div className="flex min-h-screen bg-paper">
      <aside className="sticky top-0 hidden h-screen w-60 shrink-0 bg-ink-950 md:flex md:flex-col">
        <div className="border-b border-white/10 px-5 py-5">
          <p className="font-display text-base font-semibold text-white">NAPS Admin</p>
          <p className="text-xs text-plum-300/60">
            {me?.role === "SUPER_ADMIN" ? "Super Admin console" : "Admin console"}
          </p>
        </div>
        <nav className="flex-1 space-y-1 px-3 py-4" aria-label="Admin">
          {NAV.filter((item) => !("superAdminOnly" in item && item.superAdminOnly) || me?.role === "SUPER_ADMIN").map((item) => (
            <Link
              key={item.href}
              href={item.href}
              aria-current={isActive(item.href) ? "page" : undefined}
              className={`flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium ${
                isActive(item.href) ? "bg-plum-500 text-white" : "text-plum-200/80 hover:bg-white/5"
              }`}
            >
              <Icon name={item.icon} className="h-[18px] w-[18px]" />
              {item.label}
            </Link>
          ))}
        </nav>
        <div className="border-t border-white/10 px-5 py-4">
          <p className="text-xs text-plum-300/60">Signed in as</p>
          <p className="text-sm font-medium text-white">{me?.username ?? "\u00A0"}</p>
          <div className="mt-3 flex gap-3 text-xs">
            <Link href="/settings/change-password" className="font-medium text-plum-300 hover:underline">
              Change password
            </Link>
            <button onClick={handleLogout} className="font-medium text-plum-300 hover:underline">
              Log out
            </button>
          </div>
        </div>
      </aside>

      <div className="flex min-w-0 flex-1 flex-col">
        {/* Mobile top bar */}
        <header className="bg-ink-950 px-4 py-3 md:hidden">
          <div className="flex items-center justify-between">
            <p className="font-display text-base font-semibold text-white">NAPS Admin</p>
            <button onClick={handleLogout} className="text-xs font-medium text-plum-300">
              Log out
            </button>
          </div>
          <nav className="mt-3 flex flex-wrap gap-2" aria-label="Admin">
            {NAV.filter((item) => !("superAdminOnly" in item && item.superAdminOnly) || me?.role === "SUPER_ADMIN").map((item) => (
              <Link
                key={item.href}
                href={item.href}
                aria-current={isActive(item.href) ? "page" : undefined}
                className={`rounded-lg px-3 py-1.5 text-xs font-medium ${
                  isActive(item.href) ? "bg-plum-500 text-white" : "text-plum-200/80 bg-white/5"
                }`}
              >
                {item.label}
              </Link>
            ))}
          </nav>
        </header>

        <main className="flex-1 px-4 py-6 md:px-8 md:py-8">{children}</main>
      </div>
    </div>
  );
}
