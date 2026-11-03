"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useState, useSyncExternalStore } from "react";
import { DEFAULT_SETTINGS, SimEngine, type Snapshot } from "./sim/engine";
import type { Locale, Settings, Shipment, SimState, Suggestion } from "./sim/types";
import { fr, type Key } from "./i18n/fr";
import { en } from "./i18n/en";
import { es } from "./i18n/es";
import { de } from "./i18n/de";

const DICTS = { fr, en, es, de } as const;
export const LOCALES: { id: Locale; label: string; flag: string }[] = [
  { id: "fr", label: "Français", flag: "🇫🇷" },
  { id: "en", label: "English", flag: "🇬🇧" },
  { id: "es", label: "Español", flag: "🇪🇸" },
  { id: "de", label: "Deutsch", flag: "🇩🇪" },
];

const STORAGE_KEY = "agent-ops-lab:settings";
const SNAP_KEY = "agent-ops-lab:simulation";

function loadSnapshot(): Snapshot | null {
  try {
    const raw = window.localStorage.getItem(SNAP_KEY);
    return raw ? (JSON.parse(raw) as Snapshot) : null;
  } catch {
    return null;
  }
}

function saveSnapshot(e: SimEngine) {
  try {
    window.localStorage.setItem(SNAP_KEY, JSON.stringify(e.serialize()));
  } catch {
    /* quota dépassé ou stockage indisponible : la simulation continue en mémoire */
  }
}

function loadSettings(): Settings {
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (raw) return { ...DEFAULT_SETTINGS, ...JSON.parse(raw) };
  } catch {
    /* stockage indisponible */
  }
  return DEFAULT_SETTINGS;
}

function saveSettings(s: Settings) {
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(s));
  } catch {
    /* ignore */
  }
}

type Vars = Record<string, string | number | undefined>;

function theRoad(locale: Locale, road: string) {
  const auto = road.startsWith("A");
  switch (locale) {
    case "fr":
      return auto ? `l'${road}` : `la ${road}`;
    case "en":
      return `the ${road}`;
    case "es":
      return `la ${road}`;
    case "de":
      return `der ${road}`;
  }
}

export function makeT(locale: Locale) {
  const dict = DICTS[locale];
  const t = (key: Key | string, vars?: Vars): string => {
    let s: string = (dict as Record<string, string>)[key] ?? (fr as Record<string, string>)[key] ?? key;
    if (!vars) return s;
    const v: Vars = { ...vars };
    if (typeof v.kind === "string") v.kind = t(`incident.${v.kind}`);
    if (typeof v.type === "string") v.type = t(`sugType.${v.type}`);
    if (v.by === "agent") v.by = t("common.agent");
    if (typeof v.road === "string") v.theRoad = theRoad(locale, v.road);
    if (typeof v.report === "string") {
      const r = t(`drv.report.${v.report}`);
      v.report = locale === "de" ? r : r.toLowerCase(); // les noms allemands gardent leur majuscule
    }
    const startsWithVar = s.startsWith("{");
    s = s.replace(/\{(\w+)\}/g, (_, k) => (v[k] !== undefined ? String(v[k]) : `{${k}}`));
    // majuscule si la phrase commence par une variable (« l'agent a… » → « L'agent a… »)
    return startsWithVar ? s.charAt(0).toUpperCase() + s.slice(1) : s;
  };
  return t;
}

export type T = ReturnType<typeof makeT>;

function pad(n: number) {
  return String(Math.floor(n)).padStart(2, "0");
}

interface Ctx {
  engine: SimEngine;
  state: SimState;
  settings: Settings;
  setSettings: (p: Partial<Settings>) => void;
  t: T;
  time: (min: number) => string;
  dur: (min: number) => string;
  review: string | null;
  setReview: (id: string | null) => void;
  toast: string | null;
  notify: (msg: string) => void;
}

const SimContext = createContext<Ctx | null>(null);

const noopSubscribe = () => () => {};

let singleton: SimEngine | null = null;
function getEngine(): SimEngine {
  if (!singleton) {
    singleton = new SimEngine(loadSettings());
    const snap = loadSnapshot();
    if (snap) singleton.hydrate(snap);
  }
  return singleton;
}

export function SimProvider({ children }: { children: React.ReactNode }) {
  // vrai côté client uniquement : la simulation (horloge, localStorage) ne tourne pas au rendu serveur
  const mounted = useSyncExternalStore(noopSubscribe, () => true, () => false);
  if (!mounted) return <Splash />;
  return <SimInner>{children}</SimInner>;
}

function Splash() {
  return (
    <div className="grid min-h-screen place-items-center bg-[var(--bg)]">
      <div className="flex items-center gap-3 text-sm text-[var(--muted)]">
        <span className="size-2 animate-pulse rounded-full bg-[var(--accent)]" />
        Agent Ops Lab
      </div>
    </div>
  );
}

function SimInner({ children }: { children: React.ReactNode }) {
  const engine = getEngine();
  const state = useSyncExternalStore(engine.subscribe, engine.getState, engine.getState);
  const [settings, setLocal] = useState<Settings>(engine.settings);
  const [review, setReview] = useState<string | null>(null);
  const [toast, setToast] = useState<string | null>(null);

  useEffect(() => {
    engine.start();
    const save = () => saveSnapshot(engine);
    const every = window.setInterval(save, 3000);
    const onHide = () => document.visibilityState === "hidden" && save();
    window.addEventListener("pagehide", save);
    document.addEventListener("visibilitychange", onHide);
    return () => {
      save();
      engine.stop();
      window.clearInterval(every);
      window.removeEventListener("pagehide", save);
      document.removeEventListener("visibilitychange", onHide);
    };
  }, [engine]);

  useEffect(() => {
    document.documentElement.lang = settings.locale;
  }, [settings.locale]);

  const setSettings = useCallback(
    (p: Partial<Settings>) => {
      engine.updateSettings(p);
      setLocal({ ...engine.settings });
      saveSettings(engine.settings);
    },
    [engine],
  );

  const notify = useCallback((msg: string) => {
    setToast(msg);
    window.setTimeout(() => setToast((cur) => (cur === msg ? null : cur)), 3200);
  }, []);

  const value = useMemo<Ctx>(() => {
    const t = makeT(settings.locale);
    const time = (min: number) => {
      const day = Math.floor(min / 1440);
      const m = ((min % 1440) + 1440) % 1440;
      const base = `${pad(m / 60)}:${pad(m % 60)}`;
      return day > state.day ? `${base} ${t("common.dayPlus", { n: day - state.day })}` : base;
    };
    const dur = (min: number) => {
      const m = Math.max(0, Math.round(min));
      if (m < 60) return t("common.min", { n: m });
      return t("common.hm", { h: Math.floor(m / 60), m: pad(m % 60) });
    };
    return { engine, state, settings, setSettings, t, time, dur, review, setReview, toast, notify };
  }, [engine, state, settings, setSettings, review, toast, notify]);

  return <SimContext.Provider value={value}>{children}</SimContext.Provider>;
}

export function useSim() {
  const c = useContext(SimContext);
  if (!c) throw new Error("useSim hors SimProvider");
  return c;
}

const TYPE_ORDER = { reroute: 0, reefer: 1, notify: 2 } as const;

/** Suggestions en attente, de la plus utile à la moins utile. */
export function rankPending(list: Suggestion[]) {
  return list
    .filter((g) => g.status === "pending")
    .sort((a, b) => {
      if (a.type !== b.type) return TYPE_ORDER[a.type] - TYPE_ORDER[b.type];
      if (a.reroute && b.reroute) return b.reroute.gainMin - a.reroute.gainMin;
      if (a.notify && b.notify) return b.notify.delayMin - a.notify.delayMin;
      return b.confidence - a.confidence;
    });
}

export const HEALTH_ORDER = { late: 0, risk: 1, ontime: 2, planned: 3, delivered: 4 } as const;

export function sortByUrgency(engine: SimEngine, list: Shipment[]) {
  return [...list].sort((a, b) => {
    const ha = HEALTH_ORDER[engine.health(a)];
    const hb = HEALTH_ORDER[engine.health(b)];
    if (ha !== hb) return ha - hb;
    return engine.eta(a) - engine.eta(b);
  });
}
