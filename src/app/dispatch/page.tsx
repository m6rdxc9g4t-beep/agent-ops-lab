"use client";

import { useCallback, useState } from "react";
import { Bot, Snowflake } from "lucide-react";
import { useSim, sortByUrgency, rankPending } from "@/lib/store";
import { HUBS } from "@/lib/sim/network";
import type { Shipment } from "@/lib/sim/types";
import { MapView } from "@/components/MapView";
import { SuggestionCard } from "@/components/SuggestionCard";
import { DriverTimeline } from "@/components/DriverTimeline";
import { Avatar, HEALTH_COLOR, Pill, Segmented, StatusPill } from "@/components/ui";

type F = "all" | "attention" | "onroad" | "delivered";

export default function Dispatch() {
  const { state, engine, settings, t, time } = useSim();
  const [f, setF] = useState<F>("attention");
  const [sel, setSel] = useState<string | null>(null);

  const match = useCallback(
    (s: Shipment) => {
      const h = engine.health(s);
      if (f === "attention") return h === "late" || h === "risk" || engine.state.suggestions.some((g) => g.shipmentId === s.id && g.status === "pending");
      if (f === "onroad") return s.phase === "en_route" || s.phase === "stopped";
      if (f === "delivered") return s.phase === "delivered";
      return true;
    },
    [engine, f],
  );

  const list = sortByUrgency(engine, state.shipments.filter(match));
  const pending = rankPending(state.suggestions);
  const handled = state.suggestions.filter((g) => g.status !== "pending" && g.status !== "expired").slice(0, 6);
  const active = state.shipments.filter((s) => s.phase !== "delivered").length;
  const pendingIds = new Set(pending.map((g) => g.shipmentId));

  return (
    <div className="mx-auto max-w-[1600px] space-y-4">
      <div className="grid gap-3 xl:grid-cols-[340px_minmax(0,1fr)_360px]">
        {/* file de dispatch */}
        <section className="card order-3 flex flex-col overflow-hidden xl:order-1 xl:h-[calc(100vh-108px)]" aria-label={t("dispatch.queue")}>
          <div className="border-b border-line px-3 pb-2.5 pt-3">
            <div className="flex items-baseline gap-2">
              <h2 className="text-sm font-semibold">{t("dispatch.queue")}</h2>
              <span className="tnum truncate text-xs text-muted">{t("dispatch.queueSub", { n: list.length })}</span>
            </div>
            <div className="mt-2">
              <Segmented<F>
                value={f}
                onChange={setF}
                label={t("dispatch.queue")}
                options={[
                  { id: "attention", label: t("filter.attention") },
                  { id: "onroad", label: t("filter.onroad") },
                  { id: "all", label: t("filter.all") },
                  { id: "delivered", label: t("filter.delivered") },
                ]}
              />
            </div>
          </div>
          <ul className="scroll-thin max-h-[60vh] flex-1 overflow-y-auto xl:max-h-none">
            {list.map((s) => {
              const h = engine.health(s);
              const on = sel === s.id;
              const waiting = pendingIds.has(s.id);
              return (
                <li key={s.id} className="border-b border-line last:border-b-0">
                  <button
                    type="button"
                    aria-pressed={on}
                    onClick={() => setSel(on ? null : s.id)}
                    className={`block w-full px-3 py-2 text-left transition-colors focus-visible:-outline-offset-2 ${on ? "bg-accent-soft" : "hover:bg-hover"}`}
                  >
                    <div className="flex items-center gap-2">
                      <span className="tnum shrink-0 text-xs font-medium text-muted">{s.id}</span>
                      <span className="min-w-0 flex-1 truncate text-sm font-medium">
                        {HUBS[s.origin].name} → {HUBS[s.destination].name}
                      </span>
                      {s.phase === "stopped" && <Pill tone="warn">{t(`stop.${s.stopReason ?? "break"}`)}</Pill>}
                      {s.reeferFault && (
                        <Pill tone="bad">
                          <Snowflake className="size-3" aria-hidden /> {t("common.celsius", { n: s.tempC?.toFixed(1) ?? "" })}
                        </Pill>
                      )}
                      {waiting && <span className="size-1.5 shrink-0 rounded-full bg-accent" title={t("kpi.pending")} aria-label={t("kpi.pending")} />}
                    </div>
                    <div className="mt-1 flex items-center gap-1.5 text-xs text-muted">
                      <Avatar name={s.driver.name} size={16} />
                      <span className="min-w-0 truncate">{s.driver.name}</span>
                      <span className="tnum ml-auto shrink-0" style={{ color: h === "ontime" ? undefined : HEALTH_COLOR[h] }}>
                        {t("field.eta")} {time(engine.eta(s))}
                        <span className="text-faint"> · {time(s.windowEnd)}</span>
                      </span>
                      <StatusPill health={h} className="hidden w-[74px] sm:inline-flex" />
                    </div>
                  </button>
                </li>
              );
            })}
            {list.length === 0 && <li className="px-3 py-8 text-center text-sm text-muted">{t("journal.empty")}</li>}
          </ul>
        </section>

        {/* carte */}
        <MapView selectedId={sel} onSelect={(id) => setSel(id)} proposals="all" className="order-1 h-[52vh] min-h-[320px] xl:order-2 xl:h-[calc(100vh-108px)]" />

        {/* agent */}
        <section className="card order-2 flex flex-col overflow-hidden xl:order-3 xl:h-[calc(100vh-108px)]" aria-label={t("common.agentName")}>
          <div className="flex items-center gap-2.5 border-b border-line px-3 py-2.5">
            <span className="grid size-7 shrink-0 place-items-center rounded-lg bg-accent-soft text-accent-text" aria-hidden>
              <Bot className="size-4" />
            </span>
            <div className="min-w-0 flex-1">
              <h2 className="text-sm font-semibold">{t("common.agentName")}</h2>
              <p className="tnum truncate text-xs text-muted">
                <span className={pending.length ? "font-medium text-accent-text" : ""}>{t("agent.pending", { n: pending.length })}</span>
                {" · "}
                {settings.autoApprove ? t("agent.autoOn", { n: Math.round(settings.autoThreshold * 100) }) : t("agent.autoOff")}
              </p>
            </div>
          </div>
          <div className="scroll-thin flex-1 space-y-2 overflow-y-auto p-2.5">
            {pending.map((g) => (
              <SuggestionCard key={g.id} g={g} onFocus={(id) => setSel(id)} active={sel === g.shipmentId} />
            ))}
            {pending.length === 0 && <p className="px-1 py-6 text-center text-sm text-muted">{t("agent.empty", { n: active })}</p>}
            {handled.length > 0 && (
              <>
                <p className="group-label px-1 pt-2">{t("agent.history")}</p>
                {handled.map((g) => (
                  <SuggestionCard key={g.id} g={g} onFocus={(id) => setSel(id)} />
                ))}
              </>
            )}
          </div>
        </section>
      </div>

      <DriverTimeline limit={10} />
    </div>
  );
}
