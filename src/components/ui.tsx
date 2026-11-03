"use client";

import type { Health } from "@/lib/sim/types";
import { useSim } from "@/lib/store";

export const HEALTH_COLOR: Record<Health, string> = {
  ontime: "var(--ok)",
  risk: "var(--warn)",
  late: "var(--bad)",
  delivered: "var(--faint)",
  planned: "var(--accent)",
};

export const HEALTH_HEX: Record<Health, string> = {
  ontime: "#14a05a",
  risk: "#d98b00",
  late: "#e5484d",
  delivered: "#a3a3b2",
  planned: "#6b46ff",
};

const PILL: Record<Health, string> = {
  ontime: "bg-ok-soft text-ok",
  risk: "bg-warn-soft text-warn",
  late: "bg-bad-soft text-bad",
  delivered: "bg-[#f0f0f4] text-muted",
  planned: "bg-accent-soft text-accent",
};

export function StatusPill({ health, className = "" }: { health: Health; className?: string }) {
  const { t } = useSim();
  return (
    <span className={`inline-flex items-center gap-1.5 rounded-full px-2 py-0.5 text-[11px] font-semibold ${PILL[health]} ${className}`}>
      <span className="size-1.5 rounded-full" style={{ background: HEALTH_COLOR[health] }} />
      {t(`status.${health}`)}
    </span>
  );
}

export function Pill({ children, tone = "neutral", className = "" }: { children: React.ReactNode; tone?: "neutral" | "accent" | "ok" | "warn" | "bad"; className?: string }) {
  const tones = {
    neutral: "bg-[#f0f0f4] text-muted",
    accent: "bg-accent-soft text-accent",
    ok: "bg-ok-soft text-ok",
    warn: "bg-warn-soft text-warn",
    bad: "bg-bad-soft text-bad",
  };
  return <span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-semibold ${tones[tone]} ${className}`}>{children}</span>;
}

type BtnProps = React.ButtonHTMLAttributes<HTMLButtonElement> & { variant?: "dark" | "ghost" | "accent" | "outline"; size?: "sm" | "md" };

export function Button({ variant = "outline", size = "md", className = "", ...p }: BtnProps) {
  const v = {
    dark: "bg-ink text-white hover:bg-black",
    accent: "bg-accent text-white hover:brightness-110",
    outline: "border border-line bg-white text-ink hover:bg-[#f7f7fa]",
    ghost: "text-muted hover:text-ink hover:bg-[#f0f0f4]",
  }[variant];
  const s = size === "sm" ? "h-7 px-2.5 text-xs" : "h-9 px-3.5 text-sm";
  return (
    <button
      {...p}
      className={`inline-flex shrink-0 items-center justify-center gap-1.5 rounded-full font-medium transition disabled:opacity-40 ${v} ${s} ${className}`}
    />
  );
}

export function SectionTitle({ title, sub, right }: { title: string; sub?: string; right?: React.ReactNode }) {
  return (
    <div className="mb-3 flex items-start justify-between gap-3">
      <div>
        <h2 className="text-sm font-semibold">{title}</h2>
        {sub && <p className="mt-0.5 text-xs text-muted">{sub}</p>}
      </div>
      {right}
    </div>
  );
}

export function Avatar({ name, size = 28 }: { name: string; size?: number }) {
  const initials = name
    .split(/\s+/)
    .map((p) => p[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();
  let h = 0;
  for (const c of name) h = (h * 31 + c.charCodeAt(0)) % 360;
  return (
    <span
      className="inline-grid shrink-0 place-items-center rounded-full font-semibold text-white"
      style={{ width: size, height: size, fontSize: size * 0.38, background: `hsl(${h} 45% 45%)` }}
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
      className={`relative h-5 w-9 shrink-0 rounded-full transition ${on ? "bg-accent" : "bg-[#d9d9e2]"}`}
    >
      <span className={`absolute top-0.5 size-4 rounded-full bg-white shadow transition-all ${on ? "left-[18px]" : "left-0.5"}`} />
    </button>
  );
}

export function Segmented<T extends string | number>({ value, options, onChange }: { value: T; options: { id: T; label: React.ReactNode }[]; onChange: (v: T) => void }) {
  return (
    <div className="inline-flex flex-wrap gap-1 rounded-full bg-[#f0f0f4] p-1">
      {options.map((o) => (
        <button
          key={String(o.id)}
          onClick={() => onChange(o.id)}
          className={`rounded-full px-3 py-1 text-xs font-medium transition ${value === o.id ? "bg-white text-ink shadow-sm" : "text-muted hover:text-ink"}`}
        >
          {o.label}
        </button>
      ))}
    </div>
  );
}
