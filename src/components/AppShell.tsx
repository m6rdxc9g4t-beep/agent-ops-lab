"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useMemo, useState } from "react";
import { Bell, LayoutGrid, MapPinned, Pause, Play, ScrollText, Search, Send, Settings2 } from "lucide-react";
import { useSim } from "@/lib/store";
import { HUBS } from "@/lib/sim/network";
import { Avatar, StatusPill } from "./ui";
import { ReviewModal } from "./ReviewModal";

const NAV = [
  { href: "/", key: "nav.dashboard", icon: LayoutGrid },
  { href: "/dispatch", key: "nav.dispatch", icon: Send },
  { href: "/suivi", key: "nav.tracking", icon: MapPinned },
  { href: "/journal", key: "nav.journal", icon: ScrollText },
  { href: "/parametres", key: "nav.settings", icon: Settings2 },
] as const;

const SPEEDS = [1, 10, 60, 300];

function isActive(path: string, href: string) {
  if (href === "/") return path === "/" || path.startsWith("/expeditions");
  return path.startsWith(href);
}

export function AppShell({ children }: { children: React.ReactNode }) {
  const path = usePathname();
  const { t, toast } = useSim();
  return (
    <div className="flex min-h-screen">
      {/* barre latérale (tablette / desktop) */}
      <aside className="sticky top-0 hidden h-screen w-[68px] shrink-0 flex-col items-center gap-1 border-r border-line bg-white py-4 md:flex xl:w-[220px] xl:items-stretch xl:px-3">
        <Link href="/" className="mb-5 flex items-center gap-2.5 xl:px-2">
          <span className="grid size-8 place-items-center rounded-xl bg-ink text-sm font-bold text-white">A</span>
          <span className="hidden text-sm font-semibold xl:block">{t("app.name")}</span>
        </Link>
        {NAV.map(({ href, key, icon: Icon }) => {
          const on = isActive(path, href);
          return (
            <Link
              key={href}
              href={href}
              title={t(key)}
              className={`flex h-10 items-center gap-3 rounded-xl px-2.5 text-sm transition ${on ? "bg-accent-soft font-semibold text-accent" : "text-muted hover:bg-[#f3f3f7] hover:text-ink"}`}
            >
              <Icon className="size-[18px] shrink-0" />
              <span className="hidden xl:block">{t(key)}</span>
            </Link>
          );
        })}
        <div className="mt-auto hidden rounded-xl bg-[#f6f6f9] p-3 text-[11px] leading-snug text-muted xl:block">{t("app.tagline")}</div>
      </aside>

      <div className="flex min-w-0 flex-1 flex-col">
        <TopBar />
        <main className="flex-1 px-3 pb-24 pt-3 sm:px-5 md:pb-8 lg:px-6">{children}</main>
      </div>

      {/* navigation mobile */}
      <nav className="fixed inset-x-0 bottom-0 z-30 flex border-t border-line bg-white/95 pb-[env(safe-area-inset-bottom)] backdrop-blur md:hidden">
        {NAV.map(({ href, key, icon: Icon }) => {
          const on = isActive(path, href);
          return (
            <Link key={href} href={href} className={`flex flex-1 flex-col items-center gap-0.5 py-2 text-[10px] ${on ? "font-semibold text-accent" : "text-muted"}`}>
              <Icon className="size-5" />
              <span className="max-w-full truncate px-0.5">{t(key)}</span>
            </Link>
          );
        })}
      </nav>

      <ReviewModal />
      {toast && (
        <div className="fixed bottom-20 left-1/2 z-50 -translate-x-1/2 rounded-full bg-ink px-4 py-2 text-sm text-white shadow-lg md:bottom-6">{toast}</div>
      )}
    </div>
  );
}

function TopBar() {
  const { t, time, state, settings, setSettings, engine } = useSim();
  const router = useRouter();
  const [q, setQ] = useState("");
  const [focus, setFocus] = useState(false);
  const [mobileSearch, setMobileSearch] = useState(false);
  const pending = state.suggestions.filter((g) => g.status === "pending").length;
  const paused = settings.speed === 0;

  const results = useMemo(() => {
    const s = q.trim().toLowerCase();
    if (!s) return [];
    return state.shipments
      .filter((x) =>
        [x.id, x.client, x.driver.name, x.plate, HUBS[x.origin].name, HUBS[x.destination].name].some((f) => f.toLowerCase().includes(s)),
      )
      .slice(0, 6);
  }, [q, state.shipments]);

  return (
    <header className="sticky top-0 z-20 flex items-center gap-2 border-b border-line bg-[var(--bg)]/90 px-3 py-2.5 backdrop-blur sm:px-5 lg:px-6">
      <Link href="/" className="grid size-8 shrink-0 place-items-center rounded-xl bg-ink text-sm font-bold text-white md:hidden">A</Link>
      <button
        onClick={() => setMobileSearch((v) => !v)}
        className="grid size-9 shrink-0 place-items-center rounded-full border border-line bg-white sm:hidden"
        aria-label={t("top.search")}
      >
        <Search className="size-4" />
      </button>
      <div className={`${mobileSearch ? "absolute inset-x-3 top-[52px]" : "hidden"} min-w-0 flex-1 sm:relative sm:inset-auto sm:top-auto sm:block sm:max-w-md`}>
        <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-faint" />
        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          onFocus={() => setFocus(true)}
          onBlur={() => setTimeout(() => setFocus(false), 150)}
          autoFocus={mobileSearch}
          placeholder={t("top.search")}
          className="h-9 w-full rounded-full border border-line bg-white pl-9 pr-3 text-sm outline-none placeholder:text-faint focus:border-accent"
        />
        {focus && q && (
          <div className="absolute inset-x-0 top-11 z-30 overflow-hidden rounded-2xl border border-line bg-white shadow-xl">
            {results.length === 0 && <p className="p-3 text-sm text-muted">{t("top.noResult")}</p>}
            {results.map((x) => (
              <button
                key={x.id}
                onMouseDown={() => {
                  router.push(`/expeditions/${x.id}`);
                  setQ("");
                  setMobileSearch(false);
                }}
                className="flex w-full items-center gap-3 px-3 py-2 text-left hover:bg-[#f6f6f9]"
              >
                <Avatar name={x.driver.name} size={26} />
                <span className="min-w-0 flex-1">
                  <span className="block text-sm font-medium">{x.id} · {x.client}</span>
                  <span className="block truncate text-xs text-muted">{HUBS[x.origin].name} → {HUBS[x.destination].name} · {x.driver.name}</span>
                </span>
                <StatusPill health={engine.health(x)} />
              </button>
            ))}
          </div>
        )}
      </div>

      <div className="ml-auto flex items-center gap-1.5 sm:gap-2">
        <div className="flex items-center gap-1 rounded-full border border-line bg-white p-1 pl-3">
          <span className="hidden text-[11px] font-medium uppercase tracking-wide text-faint sm:inline">{t("top.sim")}</span>
          <span className="tnum min-w-[42px] text-sm font-semibold">{time(state.now)}</span>
          <button
            onClick={() => setSettings({ speed: paused ? 60 : 0 })}
            title={paused ? t("top.play") : t("top.pause")}
            className="grid size-7 place-items-center rounded-full bg-ink text-white"
          >
            {paused ? <Play className="size-3.5" /> : <Pause className="size-3.5" />}
          </button>
          <select
            aria-label={t("top.speed")}
            value={paused ? 0 : settings.speed}
            onChange={(e) => setSettings({ speed: Number(e.target.value) })}
            className="h-7 rounded-full bg-[#f0f0f4] px-2 text-xs font-medium outline-none"
          >
            {paused && <option value={0}>—</option>}
            {SPEEDS.map((s) => (
              <option key={s} value={s}>×{s}</option>
            ))}
          </select>
        </div>
        <Link href="/dispatch" className="relative grid size-9 place-items-center rounded-full border border-line bg-white" title={t("top.pending", { n: pending })}>
          <Bell className="size-4" />
          {pending > 0 && (
            <span className="absolute -right-1 -top-1 grid h-[18px] min-w-[18px] place-items-center rounded-full bg-accent px-1 text-[10px] font-bold text-white">{pending}</span>
          )}
        </Link>
        <span className="hidden sm:block">
          <Avatar name={settings.operatorName || "?"} size={34} />
        </span>
      </div>
    </header>
  );
}
