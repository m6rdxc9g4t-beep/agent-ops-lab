"use client";

import type { Health } from "@/lib/sim/types";
import { useSim } from "@/lib/store";

/**
 * Couleur d'un état d'expédition, en texte (ETA, chiffres). Règle du témoin muet :
 * « à l'heure » reste à la couleur du texte, seuls « à risque » et « en retard » sont colorés.
 */
export const HEALTH_COLOR: Record<Health, string> = {
  ontime: "var(--ink)",
  risk: "var(--warn)",
  late: "var(--bad)",
  delivered: "var(--faint)",
  planned: "var(--faint)",
};

/** Même chose pour un remplissage (barres de progression, planning). */
export const HEALTH_FILL: Record<Health, string> = {
  ontime: "var(--muted)",
  risk: "var(--warn)",
  late: "var(--bad)",
  delivered: "var(--faint)",
  planned: "var(--line-strong)",
};

const DOT: Record<Health, string> = {
  ontime: "bg-faint/70",
  risk: "bg-warn",
  late: "bg-bad",
  delivered: "bg-transparent ring-1 ring-inset ring-faint",
  planned: "bg-transparent ring-1 ring-inset ring-faint",
};

const STATE_TEXT: Record<Health, string> = {
  ontime: "text-muted",
  risk: "text-warn",
  late: "text-bad",
  delivered: "text-faint",
  planned: "text-faint",
};

/** État d'une expédition : pastille de 6 px + libellé, sans fond. */
export function StatusPill({ health, className = "" }: { health: Health; className?: string }) {
  const { t } = useSim();
  return (
    <span className={`inline-flex shrink-0 items-center gap-1.5 whitespace-nowrap text-xs font-medium ${STATE_TEXT[health]} ${className}`}>
      <span className={`size-1.5 rounded-full ${DOT[health]}`} aria-hidden />
      {t(`status.${health}`)}
    </span>
  );
}

type Tone = "neutral" | "accent" | "ok" | "warn" | "bad";

const TONES: Record<Tone, string> = {
  neutral: "bg-hover text-muted",
  accent: "bg-accent-soft text-accent-text",
  ok: "bg-ok-soft text-ok",
  warn: "bg-warn-soft text-warn",
  bad: "bg-bad-soft text-bad",
};

/** Étiquette compacte (5 px de rayon). Les tons colorés sont réservés à ce qui n'est pas nominal. */
export function Pill({ children, tone = "neutral", className = "" }: { children: React.ReactNode; tone?: Tone; className?: string }) {
  return (
    <span className={`inline-flex h-5 shrink-0 items-center gap-1 whitespace-nowrap rounded-md px-1.5 text-xs font-medium ${TONES[tone]} ${className}`}>
      {children}
    </span>
  );
}

type BtnProps = React.ButtonHTMLAttributes<HTMLButtonElement> & { variant?: "dark" | "ghost" | "accent" | "outline"; size?: "sm" | "md" };

/**
 * Boutons de la suite : `accent` (= principal, plein dans la signature), `outline` (par défaut),
 * `ghost`. `dark` est conservé pour l'API existante et rendu comme le bouton principal.
 */
export function Button({ variant = "outline", size = "md", className = "", ...p }: BtnProps) {
  const v = {
    dark: "border border-transparent bg-accent text-accent-ink hover:bg-accent-hover",
    accent: "border border-transparent bg-accent text-accent-ink hover:bg-accent-hover",
    outline: "border border-line-strong bg-card text-ink hover:bg-hover active:bg-selected",
    ghost: "border border-transparent text-muted hover:bg-hover hover:text-ink",
  }[variant];
  const s = size === "sm" ? "h-6 gap-1 px-2 text-xs" : "h-[30px] gap-1.5 px-3 text-sm max-md:h-9";
  return (
    <button
      {...p}
      className={`inline-flex shrink-0 cursor-pointer items-center justify-center rounded-lg font-medium leading-none whitespace-nowrap transition-colors disabled:cursor-not-allowed disabled:opacity-50 ${v} ${s} ${className}`}
    />
  );
}

export function SectionTitle({ title, sub, right }: { title: string; sub?: string; right?: React.ReactNode }) {
  return (
    <div className="mb-2.5 flex items-start justify-between gap-3">
      <div className="min-w-0">
        <h2 className="text-sm font-semibold">{title}</h2>
        {sub && <p className="mt-0.5 text-xs text-muted">{sub}</p>}
      </div>
      {right}
    </div>
  );
}

/** Avatar neutre : initiales sur fond de sélection (aucune couleur décorative). */
export function Avatar({ name, size = 28 }: { name: string; size?: number }) {
  const initials = name
    .split(/\s+/)
    .map((p) => p[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();
  return (
    <span
      className="inline-grid shrink-0 place-items-center rounded-full bg-selected font-semibold text-ink-2"
      style={{ width: size, height: size, fontSize: Math.max(9, size * 0.38) }}
      aria-hidden
    >
      {initials}
    </span>
  );
}

export function Toggle({ on, onChange, label }: { on: boolean; onChange: (v: boolean) => void; label?: string }) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={on}
      aria-label={label}
      onClick={() => onChange(!on)}
      className={`relative h-[18px] w-8 shrink-0 cursor-pointer rounded-full transition-colors ${on ? "bg-accent" : "bg-line-strong"}`}
    >
      <span className={`absolute top-0.5 size-3.5 rounded-full bg-white shadow-[0_1px_2px_rgb(0_0_0/0.2)] transition-all ${on ? "left-4" : "left-0.5"}`} />
    </button>
  );
}

export function Segmented<T extends string | number>({ value, options, onChange, label }: { value: T; options: { id: T; label: React.ReactNode }[]; onChange: (v: T) => void; label?: string }) {
  return (
    <div className="seg" role="group" aria-label={label}>
      {options.map((o) => (
        <button key={String(o.id)} type="button" aria-pressed={value === o.id} onClick={() => onChange(o.id)}>
          {o.label}
        </button>
      ))}
    </div>
  );
}
