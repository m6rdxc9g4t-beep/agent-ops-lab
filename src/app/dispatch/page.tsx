"use client";

import { useCallback, useState } from "react";
import { Bot, Snowflake } from "lucide-react";
import { useSim, sortByUrgency, rankPending } from "@/lib/store";
import { HUBS } from "@/lib/sim/network";
import type { Shipment } from "@/lib/sim/types";
import { MapView } from "@/components/MapView";
import { SuggestionCard } from "@/components/SuggestionCard";
import { DriverTimeline } from "@/components/DriverTimeline";
import { Avatar, Pill, Segmented, StatusPill } from "@/components/ui";

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

  return (
    <div className="mx-auto max-w-[1600px] space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2 pt-1">
        <h1 className="text-2xl font-semibold tracking-tight">{t("dispatch.title")}</h1>
        <Pill tone={settings.autoApprove ? "accent" : "neutral"}>
          <Bot className="size-3" /> {settings.autoApprove ? t("agent.autoOn", { n: Math.round(settings.autoThreshold * 100) }) : t("agent.autoOff")}
        </Pill>
      </div>

      <div className="grid gap-4 xl:grid-cols-[320px_minmax(0,1fr)_370px]">
        {/* file de dispatch */}
        <div className="card order-3 flex flex-col p-3 xl:order-1 xl:h-[calc(100vh-150px)]">
          <div className="mb-2 px-1">
            <p className="text-sm font-semibold">{t("dispatch.queue")}</p>
            <p className="text-xs text-muted">{t("dispatch.queueSub", { n: list.length })}</p>
          </div>
          <Segmented<F>
            value={f}
            onChange={setF}
            options={[
              { id: "attention", label: t("filter.attention") },
              { id: "onroad", label: t("filter.onroad") },
              { id: "all", label: t("filter.all") },
              { id: "delivered", label: t("filter.delivered") },
            ]}
          />
          <div className="scroll-thin -mx-1 mt-2 flex-1 space-y-1 overflow-y-auto px-1">
            {list.map((s) => {
              const h = engine.health(s);
              const on = sel === s.id;
              return (
                <button
                  key={s.id}
                  onClick={() => setSel(on ? null : s.id)}
                  className={`w-full rounded-xl border p-2.5 text-left transition ${on ? "border-accent bg-accent-soft/40" : "border-transparent hover:bg-[#f6f6f9]"}`}
                >
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-xs font-semibold">{s.id}</span>
                    <StatusPill health={h} />
                  </div>
                  <p className="mt-0.5 truncate text-[13px] font-medium">{HUBS[s.origin].name} → {HUBS[s.destination].name}</p>
                  <div className="mt-1 flex items-center gap-1.5 text-[11px] text-muted">
                    <Avatar name={s.driver.name} size={18} />
                    <span className="truncate">{s.driver.name}</span>
                    <span className="ml-auto tnum shrink-0">
                      {t("field.eta")} {time(engine.eta(s))} · {time(s.windowEnd)}
                    </span>
                  </div>
                  {(s.phase === "stopped" || (s.setpointC !== undefined && s.reeferFault)) && (
                    <div className="mt-1.5 flex gap-1">
                      {s.phase === "stopped" && <Pill tone="warn">{t(`stop.${s.stopReason ?? "break"}`)}</Pill>}
                      {s.reeferFault && <Pill tone="bad"><Snowflake className="size-3" /> {t("common.celsius", { n: s.tempC?.toFixed(1) ?? "" })}</Pill>}
                    </div>
                  )}
                </button>
              );
            })}
            {list.length === 0 && <p className="p-3 text-sm text-muted">{t("journal.empty")}</p>}
          </div>
        </div>

        {/* carte */}
        <MapView selectedId={sel} onSelect={(id) => setSel(id)} proposals="all" className="order-1 h-[52vh] min-h-[320px] xl:order-2 xl:h-[calc(100vh-150px)]" />

        {/* agent */}
        <div className="card order-2 flex flex-col p-3 xl:order-3 xl:h-[calc(100vh-150px)]">
          <div className="mb-2 flex items-center gap-2 px-1">
            <span className="grid size-8 place-items-center rounded-xl bg-accent text-white"><Bot className="size-4" /></span>
            <div>
              <p className="text-sm font-semibold">{t("common.agentName")}</p>
              <p className="text-xs text-muted">{t("agent.pending", { n: pending.length })}</p>
            </div>
          </div>
          <div className="scroll-thin -mx-1 flex-1 space-y-2 overflow-y-auto px-1">
            {pending.map((g, i) => (
              <SuggestionCard key={g.id} g={g} index={i} onFocus={(id) => setSel(id)} active={sel === g.shipmentId} />
            ))}
            {pending.length === 0 && <p className="rounded-xl bg-[#f6f6f9] p-3 text-sm text-muted">{t("agent.empty", { n: active })}</p>}
            {handled.length > 0 && (
              <>
                <p className="px-1 pt-3 text-[11px] font-semibold uppercase tracking-wide text-faint">{t("agent.history")}</p>
                {handled.map((g) => (
                  <SuggestionCard key={g.id} g={g} onFocus={(id) => setSel(id)} />
                ))}
              </>
            )}
          </div>
        </div>
      </div>

      <DriverTimeline limit={10} />
    </div>
  );
}
