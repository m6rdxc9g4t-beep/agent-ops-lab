"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useState } from "react";
import { ChevronLeft, Phone, Share2, Bot, Mail, Smartphone, ExternalLink, Send, CheckCheck, Clock } from "lucide-react";
import { useSim } from "@/lib/store";
import { HUBS, pathKm, pathRoads } from "@/lib/sim/network";
import { MapView } from "@/components/MapView";
import { RouteProgress } from "@/components/RouteProgress";
import { TempChart } from "@/components/TempChart";
import { SuggestionCard } from "@/components/SuggestionCard";
import { ShareModal } from "@/components/ShareModal";
import { LogList } from "@/components/LogList";
import { Avatar, Button, HEALTH_COLOR, Pill, SectionTitle, StatusPill } from "@/components/ui";

export default function ShipmentPage() {
  const { id } = useParams<{ id: string }>();
  const { state, engine, t, time, dur, notify } = useSim();
  const [share, setShare] = useState(false);
  const [msg, setMsg] = useState("");
  const s = engine.ship(decodeURIComponent(id));

  if (!s)
    return (
      <div className="mx-auto max-w-xl pt-10 text-center">
        <p className="text-muted">{t("ship.notFound")}</p>
        <Link href="/dispatch" className="mt-4 inline-block">
          <Button>{t("nav.dispatch")}</Button>
        </Link>
      </div>
    );

  const h = engine.health(s);
  const eta = engine.eta(s);
  const margin = s.windowEnd - eta; // négatif = retard
  const sugs = state.suggestions.filter((g) => g.shipmentId === s.id);
  const pending = sugs.filter((g) => g.status === "pending");
  const lastAgent = [...s.events].reverse().find((e) => e.tone === "agent" || e.tone === "bad" || e.tone === "warn");

  return (
    <div className="mx-auto max-w-[1400px] space-y-4">
      <div className="pt-1">
        <Link href="/dispatch" className="inline-flex items-center gap-1 text-xs text-muted hover:text-ink">
          <ChevronLeft className="size-3.5" /> {t("ship.back")} / {s.client}
        </Link>
        <div className="mt-1 flex flex-wrap items-center justify-between gap-3">
          <div className="flex flex-wrap items-center gap-2">
            <h1 className="text-2xl font-semibold tracking-tight">{s.id}</h1>
            <StatusPill health={h} />
            {s.rerouted && <Pill tone="accent">{t("ship.rerouted")}</Pill>}
            {s.customerNotified && <Pill tone="ok"><Mail className="size-3" /> {t("ship.notified")}</Pill>}
          </div>
          <div className="flex flex-wrap gap-2">
            <Link href={`/chauffeur/${s.id}`}>
              <Button><Smartphone className="size-4" /> {t("ship.driverView")}</Button>
            </Link>
            <a href={`/t/${s.id.toLowerCase()}`} target="_blank" rel="noreferrer">
              <Button><ExternalLink className="size-4" /> {t("ship.clientView")}</Button>
            </a>
            <Button onClick={() => setShare(true)}><Share2 className="size-4" /> {t("ship.share")}</Button>
            <Button variant="dark" onClick={() => notify(t("ship.calling", { name: s.driver.name, phone: s.driver.phone }))}>
              <Phone className="size-4" /> {t("ship.call")}
            </Button>
          </div>
        </div>
      </div>

      <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_360px]">
        <div className="space-y-4">
          <div className="card p-4">
            <div className="flex flex-wrap items-start justify-between gap-4">
              <div>
                <p className="text-xs text-muted">{t(`cargo.${s.cargo}`)} · {t("ship.pallets", { n: s.pallets })} · {t("ship.weight", { n: s.weightKg.toLocaleString() })}</p>
                <p className="mt-0.5 text-xl font-semibold">{HUBS[s.origin].name} → {HUBS[s.destination].name}</p>
                <p className="text-xs text-muted">{pathRoads(s.path).join(" · ")} · {t("common.km", { n: pathKm(s.path) })}</p>
              </div>
              <div className="flex gap-5 text-right">
                <div>
                  <p className="text-[11px] text-muted">{t("field.window")}</p>
                  <p className="tnum text-xl font-semibold">{time(s.windowStart)}–{time(s.windowEnd)}</p>
                </div>
                <div>
                  <p className="text-[11px] text-muted">{s.phase === "delivered" ? t("status.delivered") : t("ship.etaNow")}</p>
                  <p className="tnum text-xl font-semibold" style={{ color: HEALTH_COLOR[h] }}>{time(eta)}</p>
                  {s.phase !== "delivered" && (
                    <p className="text-[11px]" style={{ color: HEALTH_COLOR[h] }}>{margin >= 0 ? t("ship.vsWindow", { n: Math.floor(margin) }) : t("ship.overWindow", { n: Math.max(1, Math.ceil(-margin)) })}</p>
                  )}
                </div>
              </div>
            </div>
            <div className="mt-2">
              <RouteProgress s={s} />
            </div>
            <div className="mt-2 grid grid-cols-2 gap-2 sm:grid-cols-4">
              {[
                [t("field.speed"), s.phase === "en_route" ? t("common.kmh", { n: s.speedKmh }) : s.phase === "stopped" ? t(`stop.${s.stopReason ?? "break"}`) : "—"],
                [t("field.fuel"), t("common.pct", { n: Math.round(s.fuelPct) })],
                [t("field.driveLeft"), dur(s.drivingLeftMin)],
                [t("field.truck"), s.plate],
              ].map(([k, v]) => (
                <div key={k} className="rounded-xl bg-[#f6f6f9] p-2.5">
                  <p className="text-[10px] text-muted">{k}</p>
                  <p className="tnum truncate text-sm font-semibold">{v}</p>
                </div>
              ))}
            </div>
          </div>

          <MapView selectedId={s.id} proposals="selected" className="h-[320px] sm:h-[380px]" />

          <div className="grid gap-4 md:grid-cols-2">
            <div className="card p-4">
              <SectionTitle title={t("field.driver")} />
              <div className="flex items-center gap-3">
                <Avatar name={s.driver.name} size={40} />
                <div className="text-sm">
                  <p className="font-semibold">{s.driver.name}</p>
                  <p className="text-muted">{s.driver.phone}</p>
                </div>
              </div>
              <p className="mt-3 text-xs text-muted">{s.truckModel} · {s.plate}</p>
              <p className="mt-3 text-xs font-medium text-muted">{t("field.client")}</p>
              <p className="text-sm font-semibold">{s.client}</p>
              <p className="text-xs text-muted">{s.contact.name} · {s.contact.role}</p>
            </div>
            {s.setpointC !== undefined ? (
              <div className="card p-4">
                <TempChart s={s} />
              </div>
            ) : (
              <div className="card p-4">
                <SectionTitle title={t("field.cargo")} />
                <p className="text-sm">{t(`cargo.${s.cargo}`)}</p>
                <p className="text-xs text-muted">{t("ship.pallets", { n: s.pallets })} · {t("ship.weight", { n: s.weightKg.toLocaleString() })}</p>
              </div>
            )}
          </div>
        </div>

        <div className="space-y-4">
          <div className="card p-4">
            <div className="mb-3 flex items-center gap-2">
              <span className="grid size-7 place-items-center rounded-lg bg-accent text-white"><Bot className="size-4" /></span>
              <p className="text-sm font-semibold">{t("ship.agentBox")}</p>
            </div>
            {lastAgent && (h === "late" || h === "risk" || pending.length > 0) ? (
              <>
                <p className="text-[11px] font-semibold uppercase tracking-wide text-faint">{t("ship.whatHappened")}</p>
                <p className="mb-3 mt-1 text-sm">{t(lastAgent.key, lastAgent.vars)} · {time(lastAgent.t)}</p>
              </>
            ) : (
              <p className="mb-2 text-sm text-muted">{t("ship.noRisk")}</p>
            )}
            {pending.length > 0 && <p className="mb-2 text-[11px] font-semibold uppercase tracking-wide text-faint">{t("ship.recommendation")}</p>}
            <div className="space-y-2">
              {pending.map((g) => (
                <SuggestionCard key={g.id} g={g} />
              ))}
              {sugs
                .filter((g) => g.status === "approved" || g.status === "auto")
                .slice(0, 3)
                .map((g) => (
                  <SuggestionCard key={g.id} g={g} />
                ))}
            </div>
          </div>
          <div className="card p-4">
            <SectionTitle title={t("ship.messageDriver")} />
            <form
              onSubmit={(e) => {
                e.preventDefault();
                if (!msg.trim()) return;
                engine.sendToDriver(s.id, msg);
                notify(t("ship.sentToDriver", { name: s.driver.name }));
                setMsg("");
              }}
              className="flex gap-2"
            >
              <input
                value={msg}
                onChange={(e) => setMsg(e.target.value.slice(0, 280))}
                placeholder={t("ship.messagePlaceholder", { name: s.driver.name.split(" ")[0] })}
                className="h-9 min-w-0 flex-1 rounded-full border border-line px-3 text-sm outline-none focus:border-accent"
              />
              <Button type="submit" variant="dark" disabled={!msg.trim()} aria-label={t("ship.send")}>
                <Send className="size-4" />
              </Button>
            </form>
            <ul className="mt-3 space-y-2">
              {[...s.inbox].reverse().slice(0, 5).map((m) => (
                <li key={m.id} className="rounded-xl bg-[#f6f6f9] p-2.5">
                  <p className="text-[13px] leading-snug">{t(m.key, m.vars)}</p>
                  <p className="mt-1 flex items-center gap-1 text-[10px] text-muted">
                    {time(m.t)}
                    {m.ackAt !== undefined ? (
                      <> · <CheckCheck className="size-3 text-ok" /> {t("ship.ackDone", { t: time(m.ackAt) })}</>
                    ) : m.kind === "reroute" || m.kind === "reefer" ? (
                      <> · <Clock className="size-3 text-warn" /> {t("ship.ackPending")}</>
                    ) : null}
                  </p>
                </li>
              ))}
            </ul>
          </div>
          <div className="card p-4">
            <SectionTitle title={t("ship.history")} />
            <LogList items={[...s.events].reverse().slice(0, 20)} />
          </div>
        </div>
      </div>

      <ShareModal s={s} open={share} onClose={() => setShare(false)} />
    </div>
  );
}
