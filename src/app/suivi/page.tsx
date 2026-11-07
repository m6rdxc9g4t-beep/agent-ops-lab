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
    <div className="mx-auto max-w-[1600px]">
      <div className="grid gap-3 lg:grid-cols-[320px_minmax(0,1fr)]">
        <section className="card order-2 flex flex-col overflow-hidden lg:order-1 lg:h-[calc(100vh-108px)]" aria-label={t("tracking.title")}>
          <div className="flex items-baseline justify-between gap-2 border-b border-line px-3 py-2.5">
            <h2 className="text-sm font-semibold">{t("tracking.title")}</h2>
            <span className="tnum text-xs text-muted">{t("tracking.onRoad", { n: onRoad.length })}</span>
          </div>
          <ul className="scroll-thin max-h-[50vh] flex-1 overflow-y-auto lg:max-h-none">
            {onRoad.map((x) => {
              const h = engine.health(x);
              const on = x.id === sel;
              return (
                <li key={x.id} className="border-b border-line last:border-b-0">
                  <button
                    type="button"
                    aria-pressed={on}
                    onClick={() => setSel(on ? null : x.id)}
                    className={`flex h-12 w-full items-center gap-2.5 px-3 text-left transition-colors focus-visible:-outline-offset-2 ${on ? "bg-accent-soft" : "hover:bg-hover"}`}
                  >
                    <div className="min-w-0 flex-1">
                      <p className="tnum truncate text-sm font-medium">
                        {x.id} <span className="font-normal text-muted">· {x.plate}</span>
                      </p>
                      <p className="truncate text-xs text-muted">
                        {HUBS[x.path[x.legIndex]].name} → {HUBS[x.path[Math.min(x.legIndex + 1, x.path.length - 1)]].name}
                      </p>
                    </div>
                    <div className="shrink-0 text-right">
                      <p className="tnum text-sm font-medium">
                        {x.phase === "stopped" ? "0" : x.speedKmh}
                        <span className="text-xs font-normal text-muted"> km/h</span>
                      </p>
                      <p className="tnum flex items-center justify-end gap-1 text-xs" style={{ color: h === "ontime" ? "var(--muted)" : HEALTH_COLOR[h] }}>
                        {h !== "ontime" && <span className="size-1.5 rounded-full" style={{ background: HEALTH_COLOR[h] }} aria-hidden />}
                        <span className="sr-only">{t(`status.${h}`)} · </span>
                        {time(engine.eta(x))}
                      </p>
                    </div>
                  </button>
                </li>
              );
            })}
          </ul>
        </section>

        <div className="relative order-1 lg:order-2">
          <MapView selectedId={selected?.id ?? null} onSelect={setSel} labels={!selected} proposals={selected ? "selected" : "all"} className="h-[58vh] min-h-[360px] lg:h-[calc(100vh-108px)]" />
          {selected && (
            <div className="card absolute inset-x-2 bottom-10 z-10 p-3.5 shadow-pop sm:bottom-auto sm:left-auto sm:right-12 sm:top-2.5 sm:w-[320px]">
              <button type="button" onClick={() => setSel(null)} className="absolute right-2.5 top-2.5 grid size-6 place-items-center rounded-md text-muted hover:bg-hover hover:text-ink" aria-label={t("common.close")}>
                <X className="size-3.5" aria-hidden />
              </button>
              <div className="flex items-center gap-2 pr-7">
                <StatusPill health={engine.health(selected)} />
                {selected.phase === "stopped" && <Pill tone="warn">{t(`stop.${selected.stopReason ?? "break"}`)}</Pill>}
              </div>
              <p className="tnum mt-2 text-xs text-muted">{selected.id} · {selected.truckModel}</p>
              <p className="text-base font-semibold">{HUBS[selected.origin].name} → {HUBS[selected.destination].name}</p>
              <div className="mt-2 flex items-center gap-2 text-xs">
                <Avatar name={selected.driver.name} size={24} />
                <span className="font-medium">{selected.driver.name}</span>
                <span className="text-muted">· {selected.client}</span>
              </div>
              <div className="mt-3 hidden grid-cols-2 gap-2 sm:grid">
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
              <div className="mt-2 flex items-center justify-between rounded-xl border border-line px-2.5 py-2 text-xs">
                <span className="tnum text-muted">{t("field.eta")} · {t("field.window")} {time(selected.windowStart)}–{time(selected.windowEnd)}</span>
                <b className="tnum" style={{ color: HEALTH_COLOR[engine.health(selected)] }}>{time(engine.eta(selected))}</b>
              </div>
              <RouteProgress s={selected} compact />
              <Link href={`/expeditions/${selected.id}`} tabIndex={-1}>
                <Button className="w-full">
                  {t("common.open")} <ArrowRight className="size-3.5" aria-hidden />
                </Button>
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
    <div className="kpi px-2.5 py-2">
      <p className="flex items-center gap-1 text-xs text-muted">
        {icon}
        {label}
      </p>
      <p className={`tnum mt-0.5 text-sm font-semibold ${bad ? "text-bad" : ""}`}>{value}</p>
    </div>
  );
}
