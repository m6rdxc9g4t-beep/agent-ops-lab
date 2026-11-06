"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { AlertTriangle, Check, ChevronLeft, Coffee, Flag, Navigation, Snowflake, TrafficCone, Wrench, MessageSquare, Route } from "lucide-react";
import { useSim } from "@/lib/store";
import { HUBS, edgeBetween } from "@/lib/sim/network";
import type { DriverMessage } from "@/lib/sim/types";
import { PhoneFrame } from "@/components/PhoneFrame";
import { RouteProgress } from "@/components/RouteProgress";
import { Avatar, HEALTH_COLOR } from "@/components/ui";

const MSG_ICON = { reroute: Route, reefer: Snowflake, dispatch: MessageSquare, notified: Flag };

export default function DriverScreen() {
  const { id } = useParams<{ id: string }>();
  const { state, engine, t, time, dur, notify } = useSim();
  const s = engine.ship(decodeURIComponent(id));

  if (!s)
    return (
      <PhoneFrame dark>
        <div className="p-6">
          <Link href="/chauffeur" className="inline-flex items-center gap-1 text-sm text-muted hover:text-ink"><ChevronLeft className="size-4" aria-hidden /> {t("drv.title")}</Link>
          <p className="mt-8 text-center text-sm text-muted">{t("ship.notFound")}</p>
        </div>
      </PhoneFrame>
    );

  const h = engine.health(s);
  const eta = engine.eta(s);
  const lateBy = Math.round(eta - s.windowEnd);
  const pending = s.inbox.filter((m) => m.ackAt === undefined && (m.kind === "reroute" || m.kind === "reefer"));
  const history = [...s.inbox].reverse();
  const onLeg = s.phase !== "delivered" && s.phase !== "planned" && s.legIndex < s.path.length - 1;
  const edge = onLeg ? edgeBetween(s.path[s.legIndex], s.path[s.legIndex + 1]) : null;
  const nextHub = onLeg ? HUBS[s.path[s.legIndex + 1]] : null;
  const kmToNext = edge ? Math.max(0, edge.km - s.legKm) : 0;
  const minToNext = s.speedKmh > 0 ? (kmToNext / s.speedKmh) * 60 : (kmToNext / 70) * 60;

  const report = (k: "bouchon" | "panne" | "froid") => {
    engine.driverReport(s.id, k);
    notify(t("drv.reported"));
  };

  return (
    <PhoneFrame dark>
      <header className="flex items-center gap-3 px-4 pb-3 pt-4">
        <Link href="/chauffeur" className="grid size-9 place-items-center rounded-lg border border-line bg-card text-ink-2" aria-label={t("drv.title")}>
          <ChevronLeft className="size-4" />
        </Link>
        <Avatar name={s.driver.name} size={36} />
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-semibold">{s.driver.name}</p>
          <p className="truncate text-xs text-muted">{s.plate} · {s.truckModel}</p>
        </div>
        <span className="tnum rounded-md border border-line bg-card px-2 py-1 text-xs font-semibold">{time(state.now)}</span>
      </header>

      <main className="flex-1 space-y-3 px-3 pb-6">
        <p className="px-1 text-xs text-muted">{t("drv.mission", { id: s.id })} · {s.client}</p>

        {/* consignes à confirmer */}
        {pending.map((m) => (
          <Instruction key={m.id} m={m} onAck={() => engine.ackMessage(s.id, m.id)} />
        ))}

        {/* état principal */}
        {s.phase === "delivered" ? (
          <div className="rounded-2xl border border-line bg-card p-5">
            <Check className="size-7 text-ok" aria-hidden />
            <p className="mt-3 text-xl font-semibold">{t("drv.delivered", { t: time(s.deliveredAt ?? state.now) })}</p>
            <p className="mt-1 text-sm text-muted">{(s.deliveredAt ?? 0) <= s.windowEnd ? t("drv.deliveredOk") : t("drv.deliveredLate")}</p>
          </div>
        ) : s.phase === "planned" ? (
          <div className="rounded-2xl border border-line bg-card p-5">
            <p className="text-lg font-semibold">{t("drv.planned", { t: time(s.departAt), hub: HUBS[s.origin].name })}</p>
          </div>
        ) : (
          <div className="rounded-2xl border border-line bg-card p-4">
            {s.phase === "stopped" && (
              <div className="mb-3 flex items-center gap-2 rounded-xl bg-warn-soft px-3 py-2 text-sm font-medium text-warn">
                {s.stopReason === "break" ? <Coffee className="size-4" /> : s.stopReason === "reefer_check" ? <Snowflake className="size-4" /> : <Wrench className="size-4" />}
                {s.stopReason === "break"
                  ? t("drv.onBreak", { t: time(s.stopUntil ?? state.now) })
                  : s.stopReason === "reefer_check"
                    ? t("drv.stoppedReefer", { t: time(s.stopUntil ?? state.now) })
                    : t("drv.stoppedBreakdown", { t: time(s.stopUntil ?? state.now) })}
              </div>
            )}
            <div className="flex items-start gap-3">
              <span className="grid size-11 shrink-0 place-items-center rounded-xl bg-accent text-accent-ink" aria-hidden><Navigation className="size-5" /></span>
              <div className="min-w-0 flex-1">
                <p className="text-xs text-muted">{t("drv.next")}</p>
                <p className="truncate text-2xl font-semibold leading-tight">{nextHub?.name}</p>
                <p className="mt-0.5 text-sm text-ink-2">
                  {edge && <span className="mr-1.5 rounded-sm border border-line-strong px-1.5 py-px text-xs font-semibold text-ink">{edge.road}</span>}
                  {t("drv.in", { km: t("common.km", { n: Math.round(kmToNext) }), time: dur(minToNext) })}
                </p>
              </div>
              <div className="text-right">
                <p className="tnum text-3xl font-semibold leading-none">{s.speedKmh}</p>
                <p className="text-xs text-muted">km/h</p>
              </div>
            </div>
            <p className="mt-3 text-xs text-muted">{t("drv.dest")} · <b className="font-semibold text-ink">{HUBS[s.destination].name}</b></p>
          </div>
        )}

        {s.phase !== "planned" && (
          <div className="rounded-2xl border border-line bg-card px-3 pt-1">
            <RouteProgress s={s} compact />
          </div>
        )}

        {s.phase !== "delivered" && (
          <div className="grid grid-cols-2 gap-2">
            <div className="rounded-2xl border border-line bg-card p-3.5">
              <p className="text-xs text-muted">{t("drv.arrival")}</p>
              <p className="tnum mt-0.5 text-2xl font-semibold" style={{ color: HEALTH_COLOR[h] }}>{time(eta)}</p>
              <p className="text-xs text-muted">{lateBy > 0 ? t("drv.late", { n: dur(lateBy) }) : t("drv.onTime")}</p>
              <p className="tnum mt-1 text-xs text-faint">{t("drv.window", { start: time(s.windowStart), end: time(s.windowEnd) })}</p>
            </div>
            <div className="rounded-2xl border border-line bg-card p-3.5">
              <p className="text-xs text-muted">{t("field.driveLeft")}</p>
              <p className={`tnum mt-0.5 text-2xl font-semibold ${s.drivingLeftMin < 45 ? "text-warn" : ""}`}>{dur(s.drivingLeftMin)}</p>
              {s.phase === "en_route" && s.drivingLeftMin < 120 && (
                <button onClick={() => engine.startBreak(s.id)} className="mt-1.5 inline-flex h-7 items-center gap-1 rounded-lg border border-line-strong bg-card px-2.5 text-xs font-medium hover:bg-hover">
                  <Coffee className="size-3" /> {t("drv.takeBreak")}
                </button>
              )}
            </div>
            {s.setpointC !== undefined && s.tempC !== undefined && (
              <div className="col-span-2 flex items-center gap-3 rounded-2xl border border-line bg-card p-3.5">
                <Snowflake className="size-5 text-muted" aria-hidden />
                <div className="flex-1">
                  <p className="text-xs text-muted">{t("field.reefer")}</p>
                  <p className="text-xs text-faint">{t("ship.setpoint", { n: t("common.celsius", { n: s.setpointC }) })}</p>
                </div>
                <p className={`tnum text-2xl font-semibold ${s.tempC - s.setpointC > 1.4 ? "text-bad" : ""}`}>{t("common.celsius", { n: s.tempC.toFixed(1) })}</p>
              </div>
            )}
          </div>
        )}

        {/* signalement */}
        {(s.phase === "en_route" || s.phase === "stopped") && (
          <div className="rounded-2xl border border-line bg-card p-3.5">
            <p className="mb-2 flex items-center gap-1.5 text-xs font-semibold text-ink-2"><AlertTriangle className="size-3.5" aria-hidden /> {t("drv.report")}</p>
            <div className="grid grid-cols-3 gap-2">
              <ReportBtn icon={<TrafficCone className="size-5" />} label={t("drv.report.bouchon")} onClick={() => report("bouchon")} />
              <ReportBtn icon={<Wrench className="size-5" />} label={t("drv.report.panne")} onClick={() => report("panne")} disabled={s.phase !== "en_route"} />
              <ReportBtn icon={<Snowflake className="size-5" />} label={t("drv.report.froid")} onClick={() => report("froid")} disabled={s.setpointC === undefined || s.reeferFault} />
            </div>
          </div>
        )}

        {/* messages */}
        <div className="rounded-2xl border border-line bg-card p-3.5">
          <p className="mb-2 text-xs font-semibold text-ink-2">{t("drv.messages")}</p>
          {history.length === 0 && <p className="text-sm text-faint">{t("drv.noMessages")}</p>}
          <ul className="space-y-2.5">
            {history.slice(0, 10).map((m) => {
              const Icon = MSG_ICON[m.kind];
              return (
                <li key={m.id} className="flex gap-2.5">
                  <span className="mt-0.5 grid size-7 shrink-0 place-items-center rounded-lg bg-hover text-muted" aria-hidden><Icon className="size-3.5" /></span>
                  <div className="min-w-0 flex-1">
                    <p className="text-sm leading-snug">{t(m.key, m.vars)}</p>
                    <p className="tnum mt-0.5 text-xs text-faint">
                      {m.kind === "dispatch" ? `${t("drv.fromDispatch")} · ${m.vars?.by ?? ""} · ` : ""}
                      {time(m.t)}
                      {m.ackAt !== undefined && ` · ${t("drv.acked", { t: time(m.ackAt) })}`}
                    </p>
                  </div>
                </li>
              );
            })}
          </ul>
        </div>
      </main>
    </PhoneFrame>
  );
}

function Instruction({ m, onAck }: { m: DriverMessage; onAck: () => void }) {
  const { t, time } = useSim();
  const Icon = MSG_ICON[m.kind];
  return (
    <div className="rounded-2xl bg-accent p-4 text-accent-ink">
      <p className="flex items-center gap-1.5 text-xs font-medium opacity-85">
        <Icon className="size-3.5" /> {t("drv.newInstr")} · {time(m.t)}
      </p>
      <p className="mt-2 text-lg font-semibold leading-snug">{t(m.key, m.vars)}</p>
      <button onClick={onAck} className="mt-3 flex h-12 w-full items-center justify-center gap-2 rounded-xl bg-white text-base font-semibold text-[var(--atelier-sig-ops)] active:scale-[0.99]">
        <Check className="size-5" /> {t("drv.ack")}
      </button>
    </div>
  );
}

function ReportBtn({ icon, label, onClick, disabled }: { icon: React.ReactNode; label: string; onClick: () => void; disabled?: boolean }) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className="flex flex-col items-center gap-1.5 rounded-xl border border-line bg-hover px-1 py-3 text-xs font-medium leading-tight text-ink-2 active:bg-selected disabled:opacity-40"
    >
      {icon}
      {label}
    </button>
  );
}
