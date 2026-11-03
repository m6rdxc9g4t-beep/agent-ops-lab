"use client";

import { Truck } from "lucide-react";
import type { Shipment } from "@/lib/sim/types";
import { HUBS, edgeBetween, pathKm } from "@/lib/sim/network";
import { useSim } from "@/lib/store";
import { HEALTH_COLOR } from "./ui";

export function RouteProgress({ s, compact = false }: { s: Shipment; compact?: boolean }) {
  const { engine, t } = useSim();
  const total = pathKm(s.path);
  let done = 0;
  for (let i = 0; i < s.legIndex && i < s.path.length - 1; i++) done += edgeBetween(s.path[i], s.path[i + 1]).km;
  done = s.phase === "delivered" ? total : done + s.legKm;
  const f = total ? Math.min(1, done / total) : 0;
  const color = HEALTH_COLOR[engine.health(s)];
  const stops: { id: string; at: number }[] = [];
  let acc = 0;
  s.path.forEach((n, i) => {
    if (i > 0) acc += edgeBetween(s.path[i - 1], n).km;
    stops.push({ id: n, at: acc / total });
  });
  const shown = compact ? stops.filter((_, i) => i === 0 || i === stops.length - 1) : stops;

  return (
    <div className="pb-1 pt-2">
      <div className="relative mx-2 h-1.5 rounded-full bg-[#ececf2]">
        <div className="absolute inset-y-0 left-0 rounded-full" style={{ width: `${f * 100}%`, background: color }} />
        {stops.map((p, i) => (
          <span
            key={p.id + i}
            className="absolute top-1/2 size-2.5 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 bg-white"
            style={{ left: `${p.at * 100}%`, borderColor: p.at <= f ? color : "#cfd0da" }}
          />
        ))}
        <span
          className="absolute top-1/2 grid size-6 -translate-x-1/2 -translate-y-1/2 place-items-center rounded-full bg-ink text-white shadow"
          style={{ left: `${f * 100}%` }}
        >
          <Truck className="size-3" />
        </span>
      </div>
      <div className="relative mx-2 mt-2 h-8 text-[10px] text-muted">
        {shown.map((p, i) => (
          <span
            key={p.id + i}
            className={`absolute whitespace-nowrap ${i === 0 ? "" : i === shown.length - 1 ? "-translate-x-full" : "-translate-x-1/2"} ${!compact && i !== 0 && i !== shown.length - 1 ? "hidden sm:block" : ""}`}
            style={{ left: `${p.at * 100}%` }}
          >
            <b className="block font-medium text-ink">{HUBS[p.id].name}</b>
          </span>
        ))}
      </div>
      <p className="tnum text-right text-[10px] text-faint">{t("ship.progress", { done: Math.round(done), total })}</p>
    </div>
  );
}
