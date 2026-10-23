"use client";

import Link from "next/link";
import { useRouter, usePathname } from "next/navigation";
import { ReactNode, useEffect, useState } from "react";
import { Icon } from "@/components/icons";
import StudentCampaigns from "@/components/StudentCampaigns";

const NAV = [
  { href: "/dashboard", label: "Dashboard", icon: "home" },
  { href: "/materials", label: "Materials", icon: "folder" },
  { href: "/quiz", label: "Quiz", icon: "check" },
  { href: "/exam", label: "Exams", icon: "clock" },
  { href: "/leaderboard", label: "Ranks", icon: "trophy" },
  { href: "/ai-tutor", label: "AI Tutor", icon: "sparkle" },
] as const;

type MeResponse = {
  fullName: string;
  username: string;
  level: number | null;
  mustChangePassword?: boolean;
};

export default function StudentShell({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const [me, setMe] = useState<MeResponse | null>(null);

  useEffect(() => {
    fetch("/api/me", { cache: "no-store" })
      .then(async (r) => {
        if (r.status === 401) {
          router.replace("/login");
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
    router.push("/login");
    router.refresh();
  }

  return (
    <div className="min-h-screen bg-paper">
      <div className="flex min-h-screen">
        {/* Desktop sidebar */}
        <aside className="sticky top-0 hidden h-screen w-64 shrink-0 border-r border-plum-100 bg-white md:flex md:flex-col">
          <div className="border-b border-plum-100 px-5 py-5">
            <p className="font-display text-lg font-semibold text-plum-600">NAPS E-Learning</p>
            <p className="text-xs text-plum-700/60">FUTMinna Physics</p>
          </div>
          <nav className="flex-1 space-y-1 px-3 py-4" aria-label="Main">
            {NAV.map((item) => {
              const active = pathname?.startsWith(item.href);
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  aria-current={active ? "page" : undefined}
                  className={`flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors ${
                    active ? "bg-plum-500 text-white" : "text-ink-950/80 hover:bg-plum-50"
                  }`}
                >
                  <Icon name={item.icon} className="h-[18px] w-[18px]" />
                  {item.label === "Ranks" ? "Leaderboard" : item.label}
                </Link>
              );
            })}
          </nav>
          <div className="border-t border-plum-100 px-5 py-4">
            <p className="truncate text-sm font-medium text-ink-950">{me?.fullName ?? "\u00A0"}</p>
            <p className="text-xs text-plum-700/60">
              {me ? `@${me.username} \u00B7 ${me.level ?? "-"} Level` : "\u00A0"}
            </p>
            <div className="mt-3 flex gap-3 text-xs">
              <Link href="/settings/change-password" className="font-medium text-plum-600 hover:underline">
                Change password
              </Link>
              <button onClick={handleLogout} className="font-medium text-plum-600 hover:underline">
                Log out
              </button>
            </div>
          </div>
        </aside>

        {/* Main column */}
        <div className="flex min-w-0 flex-1 flex-col">
          <header className="flex items-center justify-between border-b border-plum-100 bg-white px-4 py-3 md:hidden">
            <p className="font-display text-base font-semibold text-plum-600">NAPS E-Learning</p>
            <div className="flex items-center gap-3">
              <span className="text-xs text-plum-700/70">{me?.level ? `${me.level} Level` : ""}</span>
              <button onClick={handleLogout} className="text-xs font-medium text-plum-600">
                Log out
              </button>
            </div>
          </header>

          <main className="flex-1 px-4 py-6 pb-24 md:px-8 md:py-8 md:pb-8"><StudentCampaigns />{children}</main>
        </div>
      </div>

      {/* Mobile bottom tab bar */}
      <nav
        aria-label="Main"
        className="fixed inset-x-0 bottom-0 z-20 flex border-t border-plum-100 bg-white md:hidden"
      >
        {NAV.map((item) => {
          const active = pathname?.startsWith(item.href);
          return (
            <Link
              key={item.href}
              href={item.href}
              aria-current={active ? "page" : undefined}
              className={`flex flex-1 flex-col items-center gap-0.5 py-2 text-[11px] font-medium ${
                active ? "text-plum-600" : "text-plum-700/50"
              }`}
            >
              <Icon name={item.icon} className="h-5 w-5" />
              {item.label}
            </Link>
          );
        })}
      </nav>
    </div>
  );
}
