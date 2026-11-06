"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useMemo, useRef, useState } from "react";
import { Bell, ChevronRight, LayoutGrid, MapPinned, Pause, Play, ScrollText, Search, Send, Settings2, Smartphone, Truck, X } from "lucide-react";
import { useSim } from "@/lib/store";
import { HUBS } from "@/lib/sim/network";
import { Avatar, StatusPill } from "./ui";
import { ReviewModal } from "./ReviewModal";
import { ThemePicker } from "./theme/ThemePicker";

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

/** Écrans « hors back-office » : application chauffeur et page de suivi client, sans barre latérale. */
export function isStandalone(path: string) {
  return path.startsWith("/chauffeur") || path.startsWith("/t/");
}

export function Toast({ children, raised = false }: { children: React.ReactNode; raised?: boolean }) {
  return (
    <div
      role="status"
      className={`fixed left-1/2 z-50 max-w-[calc(100vw-24px)] -translate-x-1/2 rounded-lg border border-line bg-card px-3 py-2 text-sm font-medium text-ink shadow-pop ${raised ? "bottom-20 md:bottom-6" : "bottom-6"}`}
    >
      {children}
    </div>
  );
}

/** Marque commune de la suite : icône carrée (dégradé de la signature, glyphe Lucide « truck »), puis « Atelier Ops Lab ». */
export function BrandTile({ small = false }: { small?: boolean }) {
  return (
    <span className={`atelier-brand__tile${small ? " atelier-brand__tile--sm" : ""}`} aria-hidden>
      <Truck />
    </span>
  );
}

function AboutDialog({ dialog }: { dialog: React.RefObject<HTMLDialogElement | null> }) {
  const { t } = useSim();
  return (
    <dialog
      ref={dialog}
      className="atelier-about"
      aria-labelledby="about-title"
      onClick={(e) => {
        if (e.target === e.currentTarget) e.currentTarget.close();
      }}
    >
      <div className="atelier-about__panel">
        <button type="button" className="atelier-about__close" aria-label={t("common.close")} onClick={() => dialog.current?.close()}>
          <X className="size-4" aria-hidden />
        </button>
        <span className="atelier-about__icon atelier-brand__tile" aria-hidden>
          <Truck />
        </span>
        <h2 id="about-title" className="atelier-about__name">
          <span className="atelier-brand__prefix">Atelier </span>Ops Lab
        </h2>
        <p className="atelier-about__tagline">{t("app.tagline")}</p>
        <p className="atelier-about__suite">{t("about.suite")}</p>
      </div>
    </dialog>
  );
}

export function AppShell({ children }: { children: React.ReactNode }) {
  const path = usePathname();
  const { t, toast, state, settings } = useSim();
  const about = useRef<HTMLDialogElement>(null);
  if (isStandalone(path))
    return (
      <>
        {children}
        {toast && <Toast>{toast}</Toast>}
      </>
    );
  const pending = state.suggestions.filter((g) => g.status === "pending").length;
  const openAbout = () => about.current?.showModal();

  return (
    <div className="flex min-h-screen">
      {/* barre latérale : icônes seules sur tablette, 232 px sur ordinateur */}
      <aside className="sticky top-0 hidden h-screen w-14 shrink-0 flex-col gap-0.5 border-r border-line bg-side px-2 pb-2 pt-3 md:flex xl:w-[232px]">
        <button type="button" className="atelier-brand mb-3 h-8 px-1.5 xl:px-2" onClick={openAbout} aria-haspopup="dialog" aria-label={t("about.open")}>
          <BrandTile />
          <span className="atelier-brand__name hidden xl:inline">
            <span className="atelier-brand__prefix">Atelier </span>Ops Lab
          </span>
        </button>
        <nav className="flex flex-col gap-px" aria-label="Navigation">
          {NAV.map(({ href, key, icon: Icon }) => {
            const on = isActive(path, href);
            const count = href === "/dispatch" ? pending : 0;
            return (
              <Link
                key={href}
                href={href}
                title={t(key)}
                aria-current={on ? "page" : undefined}
                className={`group relative flex h-[30px] items-center gap-2.5 rounded-lg px-2 text-sm font-medium transition-colors max-xl:justify-center ${on ? "bg-selected text-ink" : "text-ink-2 hover:bg-hover hover:text-ink"}`}
              >
                <Icon className={`size-4 shrink-0 ${on ? "text-ink" : "text-faint group-hover:text-ink"}`} strokeWidth={1.75} aria-hidden />
                <span className="hidden xl:inline">{t(key)}</span>
                {count > 0 && (
                  <span className="tnum ml-auto hidden text-2xs font-semibold text-accent-text xl:inline" aria-label={t("top.pending", { n: count })}>
                    {count}
                  </span>
                )}
                {count > 0 && <span className="absolute right-1.5 top-1.5 size-1.5 rounded-full bg-accent xl:hidden" aria-hidden />}
              </Link>
            );
          })}
        </nav>
        <Link
          href="/chauffeur"
          title={t("nav.driverApp")}
          className="group mt-3 flex h-[30px] items-center gap-2.5 rounded-lg px-2 text-sm font-medium text-ink-2 transition-colors hover:bg-hover hover:text-ink max-xl:justify-center"
        >
          <Smartphone className="size-4 shrink-0 text-faint group-hover:text-ink" strokeWidth={1.75} aria-hidden />
          <span className="hidden xl:inline">{t("nav.driverApp")}</span>
        </Link>

        <div className="mt-auto flex flex-col gap-2">
          <div className="hidden px-1 xl:block">
            <ThemePicker compact />
          </div>
          <div className="flex h-9 items-center gap-2 px-1.5 max-xl:justify-center" title={settings.operatorName}>
            <Avatar name={settings.operatorName || "?"} size={22} />
            <span className="hidden truncate text-sm font-medium text-ink-2 xl:inline">{settings.operatorName}</span>
          </div>
        </div>
      </aside>

      <div className="flex min-w-0 flex-1 flex-col">
        <TopBar onBrand={openAbout} pending={pending} />
        <main className="flex-1 px-3 pb-24 pt-4 sm:px-5 md:pb-8">{children}</main>
      </div>

      {/* navigation mobile */}
      <nav
        className="fixed inset-x-0 bottom-0 z-30 flex border-t border-line bg-[color-mix(in_oklab,var(--bg)_92%,transparent)] pb-[env(safe-area-inset-bottom)] backdrop-blur-md md:hidden"
        aria-label="Navigation"
      >
        {NAV.map(({ href, key, icon: Icon }) => {
          const on = isActive(path, href);
          return (
            <Link
              key={href}
              href={href}
              aria-current={on ? "page" : undefined}
              className={`relative flex flex-1 flex-col items-center gap-1 pb-1.5 pt-2 text-2xs font-medium ${on ? "text-ink" : "text-faint"}`}
            >
              <Icon className="size-5" strokeWidth={on ? 2 : 1.75} aria-hidden />
              <span className="max-w-full truncate px-0.5">{t(key)}</span>
              {href === "/dispatch" && pending > 0 && <span className="absolute right-[calc(50%-16px)] top-1.5 size-2 rounded-full bg-accent ring-2 ring-bg" aria-hidden />}
            </Link>
          );
        })}
      </nav>

      <ReviewModal />
      <AboutDialog dialog={about} />
      {toast && <Toast raised>{toast}</Toast>}
    </div>
  );
}

function ViewTitle() {
  const path = usePathname();
  const { t } = useSim();
  if (path.startsWith("/expeditions/")) {
    const id = decodeURIComponent(path.split("/")[2] ?? "");
    return (
      <h1 className="flex min-w-0 items-center gap-1 text-sm font-semibold">
        <Link href="/dispatch" className="shrink-0 font-medium text-muted hover:text-ink">
          {t("nav.dispatch")}
        </Link>
        <ChevronRight className="size-3.5 shrink-0 text-faint" aria-hidden />
        <span className="truncate">{id}</span>
      </h1>
    );
  }
  const item = NAV.find((n) => isActive(path, n.href)) ?? NAV[0];
  return <h1 className="truncate text-sm font-semibold">{t(item.key)}</h1>;
}

function TopBar({ onBrand, pending }: { onBrand: () => void; pending: number }) {
  const { t, time, state, settings, setSettings, engine } = useSim();
  const router = useRouter();
  const [q, setQ] = useState("");
  const [focus, setFocus] = useState(false);
  const [mobileSearch, setMobileSearch] = useState(false);
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
    <header className="sticky top-0 z-20 flex h-11 items-center gap-3 border-b border-line bg-[color-mix(in_oklab,var(--bg)_88%,transparent)] px-3 backdrop-blur-md backdrop-saturate-150 sm:px-5">
      {/* .atelier-brand (feuille de la marque, hors couches) impose display : l'enveloppe porte md:hidden */}
      <span className="shrink-0 md:hidden">
        <button type="button" className="atelier-brand" onClick={onBrand} aria-haspopup="dialog" aria-label={t("about.open")}>
          <BrandTile small />
        </button>
      </span>
      <div className="min-w-0 shrink">
        <ViewTitle />
      </div>

      <button
        type="button"
        onClick={() => setMobileSearch((v) => !v)}
        className="ml-auto grid size-8 shrink-0 place-items-center rounded-lg text-muted hover:bg-hover hover:text-ink sm:hidden"
        aria-label={t("top.search")}
        aria-expanded={mobileSearch}
      >
        <Search className="size-4" aria-hidden />
      </button>
      <div
        className={`${mobileSearch ? "absolute inset-x-3 top-[50px]" : "hidden"} min-w-0 sm:relative sm:inset-auto sm:top-auto sm:ml-2 sm:block sm:w-full sm:max-w-[340px]`}
      >
        <Search className="pointer-events-none absolute left-2.5 top-1/2 size-3.5 -translate-y-1/2 text-faint" aria-hidden />
        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          onFocus={() => setFocus(true)}
          onBlur={() => setTimeout(() => setFocus(false), 150)}
          autoFocus={mobileSearch}
          placeholder={t("top.search")}
          aria-label={t("top.search")}
          className="field w-full pl-8 sm:h-[30px]"
        />
        {focus && q && (
          <div className="absolute inset-x-0 top-[38px] z-30 overflow-hidden rounded-2xl border border-line bg-card py-1 shadow-pop sm:min-w-[380px]">
            {results.length === 0 && <p className="px-3 py-2.5 text-sm text-muted">{t("top.noResult")}</p>}
            {results.map((x) => (
              <button
                key={x.id}
                onMouseDown={() => {
                  router.push(`/expeditions/${x.id}`);
                  setQ("");
                  setMobileSearch(false);
                }}
                className="flex w-full items-center gap-2.5 px-3 py-1.5 text-left hover:bg-hover"
              >
                <Avatar name={x.driver.name} size={22} />
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-sm font-medium">
                    {x.id} <span className="font-normal text-muted">· {x.client}</span>
                  </span>
                  <span className="block truncate text-xs text-muted">
                    {HUBS[x.origin].name} → {HUBS[x.destination].name} · {x.driver.name}
                  </span>
                </span>
                <StatusPill health={engine.health(x)} />
              </button>
            ))}
          </div>
        )}
      </div>

      <div className="flex shrink-0 items-center gap-1.5 sm:ml-auto sm:gap-2">
        <div className="flex h-[30px] items-center gap-1 rounded-lg border border-line-strong bg-card pl-2.5 pr-0.5">
          <span className="hidden text-xs text-muted lg:inline">{t("top.sim")}</span>
          <span className="tnum min-w-[38px] text-sm font-semibold">{time(state.now)}</span>
          <button
            type="button"
            onClick={() => setSettings({ speed: paused ? 60 : 0 })}
            title={paused ? t("top.play") : t("top.pause")}
            aria-label={paused ? t("top.play") : t("top.pause")}
            className="grid size-6 place-items-center rounded-md text-muted hover:bg-hover hover:text-ink"
          >
            {paused ? <Play className="size-3.5" aria-hidden /> : <Pause className="size-3.5" aria-hidden />}
          </button>
          <select
            aria-label={t("top.speed")}
            value={paused ? 0 : settings.speed}
            onChange={(e) => setSettings({ speed: Number(e.target.value) })}
            className="tnum hidden h-6 cursor-pointer rounded-md bg-transparent px-1 text-xs font-medium text-ink-2 outline-none hover:bg-hover sm:block"
          >
            {paused && <option value={0}>—</option>}
            {SPEEDS.map((s) => (
              <option key={s} value={s}>
                ×{s}
              </option>
            ))}
          </select>
        </div>
        <Link
          href="/dispatch"
          className="relative grid size-[30px] place-items-center rounded-lg text-muted hover:bg-hover hover:text-ink"
          title={t("top.pending", { n: pending })}
          aria-label={t("top.pending", { n: pending })}
        >
          <Bell className="size-4" aria-hidden />
          {pending > 0 && (
            <span className="tnum absolute -right-0.5 -top-0.5 grid h-4 min-w-4 place-items-center rounded-full bg-accent px-1 text-[10px] font-semibold text-accent-ink">{pending}</span>
          )}
        </Link>
      </div>
    </header>
  );
}
