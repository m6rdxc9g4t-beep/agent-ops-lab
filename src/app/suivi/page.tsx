"use client";

import Link from "next/link";
import { useState } from "react";
import { ArrowRight, Fuel, Gauge, Hourglass, Snowflake, X } from "lucide-react";
import { useSim, sortByUrgency } from "@/lib/store";
import { HUBS } from "@/lib/sim/network";
import { MapView } from "@/components/MapView";
import { Avatar, Button, HEALTH_COLOR, Pill, StatusPill } from "@/components/ui";
import { RouteProgress } from "@/components/RouteProgress";

export default function Tracking() {
  const { state, engine, t, time, dur } = useSim();
  const [sel, setSel] = useState<string | null>("EXP-48291");
  const onRoad = sortByUrgency(
    engine,
    state.shipments.filter((s) => s.phase === "en_route" || s.phase === "stopped"),
  );
  const s = sel ? engine.ship(sel) : undefined;
  const selected = s && s.phase !== "delivered" && s.phase !== "planned" ? s : undefined;

  return (
    <div className="mx-auto max-w-[1600px] space-y-3">
      <div className="flex items-center justify-between pt-1">
        <h1 className="text-2xl font-semibold tracking-tight">{t("tracking.title")}</h1>
        <Pill tone="ok">{t("tracking.onRoad", { n: onRoad.length })}</Pill>
      </div>
      <div className="grid gap-3 lg:grid-cols-[300px_minmax(0,1fr)]">
        <div className="card order-2 p-2 lg:order-1 lg:h-[calc(100vh-140px)]">
          <div className="scroll-thin grid max-h-[50vh] gap-1 overflow-y-auto sm:grid-cols-2 lg:max-h-full lg:grid-cols-1">
            {onRoad.map((x) => {
              const h = engine.health(x);
              return (
                <button
                  key={x.id}
                  onClick={() => setSel(x.id === sel ? null : x.id)}
                  className={`rounded-xl border p-2.5 text-left transition ${x.id === sel ? "border-accent bg-accent-soft/40" : "border-transparent hover:bg-[#f6f6f9]"}`}
                >
                  <div className="flex items-center gap-2">
                    <span className="h-8 w-1 rounded-full" style={{ background: HEALTH_COLOR[h] }} />
                    <div className="min-w-0 flex-1">
                      <p className="text-xs font-semibold">{x.id} <span className="font-normal text-muted">· {x.plate}</span></p>
                      <p className="truncate text-[11px] text-muted">{HUBS[x.path[x.legIndex]].name} → {HUBS[x.path[Math.min(x.legIndex + 1, x.path.length - 1)]].name}</p>
                    </div>
                    <div className="text-right">
                      <p className="tnum text-sm font-semibold">{x.phase === "stopped" ? "0" : x.speedKmh}<span className="text-[10px] font-normal text-muted"> km/h</span></p>
                      <p className="tnum text-[10px]" style={{ color: HEALTH_COLOR[h] }}>{time(engine.eta(x))}</p>
                    </div>
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        <div className="relative order-1 lg:order-2">
          <MapView selectedId={selected?.id ?? null} onSelect={setSel} labels={!selected} proposals={selected ? "selected" : "all"} className="h-[58vh] min-h-[360px] lg:h-[calc(100vh-140px)]" />
          {selected && (
            <div className="card absolute inset-x-2 bottom-10 z-10 p-3.5 shadow-xl sm:left-auto sm:right-3 sm:top-3 sm:bottom-auto sm:w-[340px]">
              <button onClick={() => setSel(null)} className="absolute right-3 top-3 grid size-6 place-items-center rounded-full text-muted hover:bg-[#f0f0f4]" aria-label={t("common.close")}>
                <X className="size-3.5" />
              </button>
              <div className="flex items-center gap-2 pr-7">
                <StatusPill health={engine.health(selected)} />
                {selected.phase === "stopped" && <Pill tone="warn">{t(`stop.${selected.stopReason ?? "break"}`)}</Pill>}
              </div>
              <p className="mt-2 text-xs text-muted">{selected.id} · {selected.truckModel}</p>
              <p className="text-base font-semibold">{HUBS[selected.origin].name} → {HUBS[selected.destination].name}</p>
              <div className="mt-2 flex items-center gap-2 text-xs">
                <Avatar name={selected.driver.name} size={24} />
                <span className="font-medium">{selected.driver.name}</span>
                <span className="text-muted">· {selected.client}</span>
              </div>
              <div className="mt-3 grid grid-cols-2 gap-1.5">
                <Stat icon={<Gauge className="size-3.5" />} label={t("field.speed")} value={t("common.kmh", { n: selected.speedKmh })} />
                {selected.tempC !== undefined ? (
                  <Stat
                    icon={<Snowflake className="size-3.5" />}
                    label={t("field.reefer")}
                    value={t("common.celsius", { n: selected.tempC.toFixed(1) })}
                    bad={selected.setpointC !== undefined && selected.tempC - selected.setpointC > 1.4}
                  />
                ) : (
                  <Stat icon={<Snowflake className="size-3.5" />} label={t("field.cargo")} value={t(`cargo.${selected.cargo}`)} />
                )}
                <Stat icon={<Fuel className="size-3.5" />} label={t("field.fuel")} value={t("common.pct", { n: Math.round(selected.fuelPct) })} />
                <Stat icon={<Hourglass className="size-3.5" />} label={t("field.driveLeft")} value={dur(selected.drivingLeftMin)} />
              </div>
              <div className="mt-2 flex items-center justify-between rounded-xl bg-[#f6f6f9] px-3 py-2 text-xs">
                <span className="text-muted">{t("field.eta")} · {t("field.window")} {time(selected.windowStart)}–{time(selected.windowEnd)}</span>
                <b className="tnum" style={{ color: HEALTH_COLOR[engine.health(selected)] }}>{time(engine.eta(selected))}</b>
              </div>
              <RouteProgress s={selected} compact />
              <Link href={`/expeditions/${selected.id}`}>
                <Button size="sm" className="w-full">{t("common.open")} <ArrowRight className="size-3.5" /></Button>
              </Link>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function Stat({ icon, label, value, bad }: { icon: React.ReactNode; label: string; value: string; bad?: boolean }) {
  return (
    <div className="rounded-xl border border-line p-2">
      <p className="flex items-center gap-1 text-[10px] text-muted">{icon}{label}</p>
      <p className={`tnum mt-0.5 text-sm font-semibold ${bad ? "text-bad" : ""}`}>{value}</p>
    </div>
  );
}
