"use client";

import type { Shipment } from "@/lib/sim/types";
import { useSim } from "@/lib/store";

export function TempChart({ s, height = 120 }: { s: Shipment; height?: number }) {
  const { t, time } = useSim();
  if (s.setpointC === undefined || s.tempC === undefined) return null;
  const pts = s.tempHistory.slice(-36);
  const W = 400;
  const H = height;
  const pad = { l: 28, r: 8, t: 10, b: 18 };
  const vals = pts.map((p) => p.v).concat([s.setpointC - 2, s.setpointC + 2, s.tempC]);
  const lo = Math.floor(Math.min(...vals)) - 0.5;
  const hi = Math.ceil(Math.max(...vals)) + 0.5;
  const x = (i: number) => pad.l + (i / Math.max(1, pts.length - 1)) * (W - pad.l - pad.r);
  const y = (v: number) => pad.t + (1 - (v - lo) / (hi - lo)) * (H - pad.t - pad.b);
  const line = pts.map((p, i) => `${i ? "L" : "M"}${x(i).toFixed(1)},${y(p.v).toFixed(1)}`).join("");
  const out = Math.abs(s.tempC - s.setpointC) > 1.4;
  const color = out ? "var(--bad)" : "var(--accent)";

  return (
    <div>
      <div className="mb-1 flex items-baseline justify-between">
        <span className="text-xs text-muted">{t("ship.temperature")}</span>
        <span className="text-xs text-muted">
          <b className="tnum text-base" style={{ color }}>{t("common.celsius", { n: s.tempC.toFixed(1) })}</b> · {t("ship.setpoint", { n: t("common.celsius", { n: s.setpointC }) })}
        </span>
      </div>
      <svg viewBox={`0 0 ${W} ${H}`} className="w-full" style={{ height }} role="img" aria-label={t("ship.temperature")}>
        <rect x={pad.l} width={W - pad.l - pad.r} y={y(s.setpointC + 2)} height={y(s.setpointC - 2) - y(s.setpointC + 2)} fill="var(--ok-soft)" />
        <line x1={pad.l} x2={W - pad.r} y1={y(s.setpointC)} y2={y(s.setpointC)} stroke="var(--ok)" strokeDasharray="3 3" strokeWidth={1} />
        {[lo + 0.5, s.setpointC, hi - 0.5].map((v) => (
          <text key={v} x={pad.l - 6} y={y(v) + 3} textAnchor="end" fontSize={9} fill="var(--faint)">
            {Math.round(v)}°
          </text>
        ))}
        {pts.length > 1 && <path d={line} fill="none" stroke={color} strokeWidth={2} strokeLinejoin="round" />}
        {pts.length > 0 && <circle cx={x(pts.length - 1)} cy={y(pts[pts.length - 1].v)} r={3.5} fill={color} />}
        {pts.length > 1 && (
          <>
            <text x={pad.l} y={H - 4} fontSize={9} fill="var(--faint)">{time(pts[0].t)}</text>
            <text x={W - pad.r} y={H - 4} fontSize={9} fill="var(--faint)" textAnchor="end">{time(pts[pts.length - 1].t)}</text>
          </>
        )}
      </svg>
    </div>
  );
}
