"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowRight, Bot, Plus, Smartphone, Snowflake, TriangleAlert } from "lucide-react";
import { useSim, sortByUrgency, rankPending } from "@/lib/store";
import { HUBS } from "@/lib/sim/network";
import { MapView } from "@/components/MapView";
import { SuggestionCard } from "@/components/SuggestionCard";
import { DriverTimeline } from "@/components/DriverTimeline";
import { RouteProgress } from "@/components/RouteProgress";
import { LogList } from "@/components/LogList";
import { Avatar, Button, HEALTH_COLOR, Pill, SectionTitle, StatusPill } from "@/components/ui";

export default function Dashboard() {
  const { state, engine, settings, t, time, dur, notify } = useSim();
  const router = useRouter();
  const hour = (state.now % 1440) / 60;
  const greet = hour < 12 ? "greet.morning" : hour < 18 ? "greet.afternoon" : "greet.evening";

  const active = state.shipments.filter((s) => s.phase !== "delivered");
  const healths = active.map((s) => engine.health(s));
  const risk = healths.filter((h) => h === "risk").length;
  const late = healths.filter((h) => h === "late").length;
  const ontime = healths.filter((h) => h === "ontime").length;
  const delivered = state.shipments.filter((s) => s.phase === "delivered");
  const deliveredOnTime = delivered.filter((s) => (s.deliveredAt ?? 0) <= s.windowEnd).length;
  const pending = rankPending(state.suggestions);
  const reeferAlerts = active.filter((s) => s.setpointC !== undefined && s.tempC !== undefined && s.tempC - s.setpointC > 1.4).length;

  // priorité : la suggestion d'itinéraire au plus fort gain, sinon l'expédition la plus urgente
  const topSug = pending[0];
  const featured = (topSug && engine.ship(topSug.shipmentId)) || sortByUrgency(engine, active)[0];

  const kpis = [
    { label: t("kpi.active"), value: active.length, sub: t("kpi.ontimeRate", { n: delivered.length ? Math.round((deliveredOnTime / delivered.length) * 100) : 100 }) },
    { label: t("kpi.ontime"), value: ontime, tone: "ok" as const },
    { label: t("kpi.risk"), value: risk, tone: "warn" as const },
    { label: t("kpi.late"), value: late, tone: "bad" as const },
    { label: t("kpi.pending"), value: pending.length, tone: "accent" as const, sub: t("kpi.needsYou") },
    { label: t("kpi.saved"), value: dur(state.savedMinutes), sub: `${t("kpi.delivered")} · ${delivered.length}` },
  ];
  // Règle du témoin muet : un compteur ne prend sa couleur que s'il signale quelque chose (non nul, non nominal).
  const toneCls = { ok: "", warn: "text-warn", bad: "text-bad", accent: "text-accent-text" };

  return (
    <div className="mx-auto max-w-[1400px] space-y-4">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h2 className="text-2xl font-semibold tracking-[-0.012em]">{t(greet, { name: settings.operatorName })}</h2>
          <p className="mt-0.5 text-sm text-muted">{t("dash.subtitle")}</p>
        </div>
        <div className="flex flex-wrap gap-2 whitespace-nowrap">
          <Link href="/dispatch" tabIndex={-1}>
            <Button>
              <Bot className="size-4 text-accent-text" aria-hidden /> {t("agent.pending", { n: pending.length })}
            </Button>
          </Link>
          <Link href="/chauffeur" className="md:hidden" tabIndex={-1}>
            <Button>
              <Smartphone className="size-4" aria-hidden /> {t("nav.driverApp")}
            </Button>
          </Link>
          <Button
            variant="accent"
            onClick={() => {
              const s = engine.addShipment();
              notify(t("log.newShipment", { id: s.id, from: HUBS[s.origin].name, to: HUBS[s.destination].name }));
            }}
          >
            <Plus className="size-4" aria-hidden /> {t("dash.newShipment")}
          </Button>
        </div>
      </div>

      {/* indicateurs : une rangée de cartes de chiffres */}
      <dl className="grid grid-cols-2 gap-2 sm:grid-cols-3 xl:grid-cols-6">
        {kpis.map((k) => (
          <div key={k.label} className="kpi px-3.5 py-3">
            <dt className="truncate text-xs font-medium text-muted">{k.label}</dt>
            <dd className={`tnum mt-1 text-xl font-semibold ${k.tone && k.value !== 0 ? toneCls[k.tone] : ""}`}>{k.value}</dd>
            {k.sub && <dd className="mt-0.5 truncate text-xs text-faint">{k.sub}</dd>}
          </div>
        ))}
      </dl>

      <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_380px]">
        {/* expédition prioritaire */}
        {featured && (
          <div className="card overflow-hidden">
            <div className="grid h-full md:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
              <div className="flex flex-col p-4">
                <div className="flex flex-wrap items-center gap-2">
                  <Pill>
                    <Bot className="size-3 text-accent-text" aria-hidden /> {t("dash.featured")}
                  </Pill>
                  <StatusPill health={engine.health(featured)} />
                  {featured.setpointC !== undefined && (
                    <Pill>
                      <Snowflake className="size-3" aria-hidden /> {t("common.celsius", { n: featured.tempC?.toFixed(1) ?? "" })}
                    </Pill>
                  )}
                </div>
                <Link href={`/expeditions/${featured.id}`} className="group mt-3 block">
                  <p className="tnum text-xs text-muted">{featured.id} · {featured.client}</p>
                  <p className="text-lg font-semibold group-hover:underline">{HUBS[featured.origin].name} → {HUBS[featured.destination].name}</p>
                </Link>
                <dl className="mt-3 grid grid-cols-3 gap-2">
                  <div className="kpi px-2.5 py-2">
                    <dt className="text-xs text-muted">{t("field.window")}</dt>
                    <dd className="tnum text-sm font-semibold">{time(featured.windowStart)}–{time(featured.windowEnd)}</dd>
                  </div>
                  <div className="kpi px-2.5 py-2">
                    <dt className="text-xs text-muted">{t("field.eta")}</dt>
                    <dd className="tnum text-sm font-semibold" style={{ color: HEALTH_COLOR[engine.health(featured)] }}>{time(engine.eta(featured))}</dd>
                  </div>
                  <div className="kpi px-2.5 py-2">
                    <dt className="text-xs text-muted">{t("field.speed")}</dt>
                    <dd className="tnum text-sm font-semibold">{t("common.kmh", { n: featured.speedKmh })}</dd>
                  </div>
                </dl>
                <RouteProgress s={featured} compact />
                <div className="mt-1 flex items-center gap-2.5">
                  <Avatar name={featured.driver.name} />
                  <div className="min-w-0 flex-1 text-xs">
                    <p className="font-medium">{featured.driver.name}</p>
                    <p className="truncate text-muted">{featured.truckModel} · {featured.plate}</p>
                  </div>
                  <Link href={`/expeditions/${featured.id}`} tabIndex={-1}>
                    <Button size="sm">
                      {t("common.open")} <ArrowRight className="size-3.5" aria-hidden />
                    </Button>
                  </Link>
                </div>
                <div className="mt-4 hidden border-t border-line pt-3 md:block">
                  <p className="group-label mb-1.5">{t("ship.history")}</p>
                  <LogList items={[...featured.events].reverse().slice(0, 4)} />
                </div>
              </div>
              <MapView selectedId={featured.id} proposals="selected" onSelect={(id) => router.push(`/expeditions/${id}`)} flush className="h-[280px] border-t border-line md:h-auto md:min-h-[340px] md:border-l md:border-t-0" />
            </div>
          </div>
        )}

        {/* brief de l'agent */}
        <div className="card flex flex-col p-4">
          <div className="flex items-center gap-2.5">
            <span className="grid size-7 place-items-center rounded-lg bg-accent-soft text-accent-text" aria-hidden>
              <Bot className="size-4" />
            </span>
            <div>
              <h2 className="text-sm font-semibold">{t("brief.title")}</h2>
              <p className="tnum text-xs text-muted">{t("brief.meta", { n: 4, t: time(state.now) })}</p>
            </div>
          </div>
          <p className="mt-3 text-base font-medium leading-snug">
            {risk + late === 0 ? t("brief.allGood", { n: active.length }) : risk + late === 1 ? t("brief.oneRisk") : t("brief.someRisk", { n: risk + late })}
          </p>
          <div className="mt-2 flex flex-wrap gap-1.5">
            {state.incidents.length > 0 && (
              <Pill tone="bad">
                <TriangleAlert className="size-3" aria-hidden /> {t("brief.incidents", { n: state.incidents.length })}
              </Pill>
            )}
            {reeferAlerts > 0 && (
              <Pill tone="warn">
                <Snowflake className="size-3" aria-hidden /> {t("brief.reefer", { n: reeferAlerts })}
              </Pill>
            )}
          </div>
          <p className="group-label mb-1.5 mt-4">{t("brief.needsApproval")}</p>
          <div className="scroll-thin -mr-1 max-h-[360px] space-y-2 overflow-y-auto pr-1">
            {pending.slice(0, 4).map((g) => (
              <SuggestionCard key={g.id} g={g} />
            ))}
            {pending.length === 0 && <p className="text-sm text-muted">{t("agent.empty", { n: active.length })}</p>}
          </div>
          <Link href="/dispatch" className="mt-3" tabIndex={-1}>
            <Button className="w-full">
              {t("brief.reviewAll")} <ArrowRight className="size-4" aria-hidden />
            </Button>
          </Link>
        </div>
      </div>

      <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_380px]">
        <DriverTimeline />
        <div className="card p-4">
          <SectionTitle title={t("dash.activity")} right={<Link href="/journal" className="text-xs font-medium text-accent-text hover:underline">{t("common.viewAll")}</Link>} />
          <LogList items={state.log.slice(0, 8)} empty={t("dash.noActivity")} />
        </div>
      </div>
    </div>
  );
}
