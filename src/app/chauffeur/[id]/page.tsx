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
          <Link href="/chauffeur" className="inline-flex items-center gap-1 text-sm text-white/60"><ChevronLeft className="size-4" /> {t("drv.title")}</Link>
          <p className="mt-8 text-center text-white/60">{t("ship.notFound")}</p>
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
        <Link href="/chauffeur" className="grid size-9 place-items-center rounded-full bg-white/10" aria-label={t("drv.title")}>
          <ChevronLeft className="size-4" />
        </Link>
        <Avatar name={s.driver.name} size={36} />
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-semibold">{s.driver.name}</p>
          <p className="truncate text-[11px] text-white/50">{s.plate} · {s.truckModel}</p>
        </div>
        <span className="tnum rounded-full bg-white/10 px-2.5 py-1 text-xs font-semibold">{time(state.now)}</span>
      </header>

      <main className="flex-1 space-y-3 px-3 pb-6">
        <p className="px-1 text-xs text-white/50">{t("drv.mission", { id: s.id })} · {s.client}</p>

        {/* consignes à confirmer */}
        {pending.map((m) => (
          <Instruction key={m.id} m={m} onAck={() => engine.ackMessage(s.id, m.id)} />
        ))}

        {/* état principal */}
        {s.phase === "delivered" ? (
          <div className="rounded-3xl bg-[#14a05a] p-5">
            <Check className="size-8" />
            <p className="mt-3 text-xl font-semibold">{t("drv.delivered", { t: time(s.deliveredAt ?? state.now) })}</p>
            <p className="mt-1 text-sm text-white/80">{(s.deliveredAt ?? 0) <= s.windowEnd ? t("drv.deliveredOk") : t("drv.deliveredLate")}</p>
          </div>
        ) : s.phase === "planned" ? (
          <div className="rounded-3xl bg-white/[0.06] p-5">
            <p className="text-lg font-semibold">{t("drv.planned", { t: time(s.departAt), hub: HUBS[s.origin].name })}</p>
          </div>
        ) : (
          <div className="rounded-3xl bg-white/[0.06] p-4">
            {s.phase === "stopped" && (
              <div className="mb-3 flex items-center gap-2 rounded-2xl bg-[#d98b00]/20 px-3 py-2 text-sm font-medium text-[#ffcf6b]">
                {s.stopReason === "break" ? <Coffee className="size-4" /> : s.stopReason === "reefer_check" ? <Snowflake className="size-4" /> : <Wrench className="size-4" />}
                {s.stopReason === "break"
                  ? t("drv.onBreak", { t: time(s.stopUntil ?? state.now) })
                  : s.stopReason === "reefer_check"
                    ? t("drv.stoppedReefer", { t: time(s.stopUntil ?? state.now) })
                    : t("drv.stoppedBreakdown", { t: time(s.stopUntil ?? state.now) })}
              </div>
            )}
            <div className="flex items-start gap-3">
              <span className="grid size-11 shrink-0 place-items-center rounded-2xl bg-accent"><Navigation className="size-5" /></span>
              <div className="min-w-0 flex-1">
                <p className="text-[11px] uppercase tracking-wide text-white/50">{t("drv.next")}</p>
                <p className="truncate text-2xl font-semibold leading-tight">{nextHub?.name}</p>
                <p className="mt-0.5 text-sm text-white/70">
                  {edge && <span className="mr-1.5 rounded bg-white px-1.5 py-px text-xs font-bold text-ink">{edge.road}</span>}
                  {t("drv.in", { km: t("common.km", { n: Math.round(kmToNext) }), time: dur(minToNext) })}
                </p>
              </div>
              <div className="text-right">
                <p className="tnum text-3xl font-semibold leading-none">{s.speedKmh}</p>
                <p className="text-[10px] text-white/50">km/h</p>
              </div>
            </div>
            <p className="mt-3 text-xs text-white/50">{t("drv.dest")} · <b className="text-white">{HUBS[s.destination].name}</b></p>
          </div>
        )}

        {s.phase !== "planned" && (
          <div className="rounded-3xl bg-white px-3 pt-1 text-ink">
            <RouteProgress s={s} compact />
          </div>
        )}

        {s.phase !== "delivered" && (
          <div className="grid grid-cols-2 gap-2">
            <div className="rounded-3xl bg-white/[0.06] p-3.5">
              <p className="text-[11px] text-white/50">{t("drv.arrival")}</p>
              <p className="tnum mt-0.5 text-2xl font-semibold" style={{ color: HEALTH_COLOR[h] }}>{time(eta)}</p>
              <p className="text-[11px] text-white/60">{lateBy > 0 ? t("drv.late", { n: dur(lateBy) }) : t("drv.onTime")}</p>
              <p className="mt-1 text-[10px] text-white/40">{t("drv.window", { start: time(s.windowStart), end: time(s.windowEnd) })}</p>
            </div>
            <div className="rounded-3xl bg-white/[0.06] p-3.5">
              <p className="text-[11px] text-white/50">{t("field.driveLeft")}</p>
              <p className={`tnum mt-0.5 text-2xl font-semibold ${s.drivingLeftMin < 45 ? "text-[#ffcf6b]" : ""}`}>{dur(s.drivingLeftMin)}</p>
              {s.phase === "en_route" && s.drivingLeftMin < 120 && (
                <button onClick={() => engine.startBreak(s.id)} className="mt-1.5 inline-flex items-center gap-1 rounded-full bg-white/10 px-2.5 py-1 text-[11px] font-medium">
                  <Coffee className="size-3" /> {t("drv.takeBreak")}
                </button>
              )}
            </div>
            {s.setpointC !== undefined && s.tempC !== undefined && (
              <div className="col-span-2 flex items-center gap-3 rounded-3xl bg-white/[0.06] p-3.5">
                <Snowflake className="size-5 text-[#9db4ff]" />
                <div className="flex-1">
                  <p className="text-[11px] text-white/50">{t("field.reefer")}</p>
                  <p className="text-[11px] text-white/40">{t("ship.setpoint", { n: t("common.celsius", { n: s.setpointC }) })}</p>
                </div>
                <p className={`tnum text-2xl font-semibold ${s.tempC - s.setpointC > 1.4 ? "text-[#ff8a8d]" : ""}`}>{t("common.celsius", { n: s.tempC.toFixed(1) })}</p>
              </div>
            )}
          </div>
        )}

        {/* signalement */}
        {(s.phase === "en_route" || s.phase === "stopped") && (
          <div className="rounded-3xl bg-white/[0.06] p-3.5">
            <p className="mb-2 flex items-center gap-1.5 text-xs font-semibold text-white/70"><AlertTriangle className="size-3.5" /> {t("drv.report")}</p>
            <div className="grid grid-cols-3 gap-2">
              <ReportBtn icon={<TrafficCone className="size-5" />} label={t("drv.report.bouchon")} onClick={() => report("bouchon")} />
              <ReportBtn icon={<Wrench className="size-5" />} label={t("drv.report.panne")} onClick={() => report("panne")} disabled={s.phase !== "en_route"} />
              <ReportBtn icon={<Snowflake className="size-5" />} label={t("drv.report.froid")} onClick={() => report("froid")} disabled={s.setpointC === undefined || s.reeferFault} />
            </div>
          </div>
        )}

        {/* messages */}
        <div className="rounded-3xl bg-white/[0.06] p-3.5">
          <p className="mb-2 text-xs font-semibold text-white/70">{t("drv.messages")}</p>
          {history.length === 0 && <p className="text-sm text-white/40">{t("drv.noMessages")}</p>}
          <ul className="space-y-2.5">
            {history.slice(0, 10).map((m) => {
              const Icon = MSG_ICON[m.kind];
              return (
                <li key={m.id} className="flex gap-2.5">
                  <span className="mt-0.5 grid size-7 shrink-0 place-items-center rounded-full bg-white/10"><Icon className="size-3.5" /></span>
                  <div className="min-w-0 flex-1">
                    <p className="text-[13px] leading-snug">{t(m.key, m.vars)}</p>
                    <p className="tnum mt-0.5 text-[10px] text-white/40">
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
    <div className="rounded-3xl bg-accent p-4 shadow-lg shadow-accent/30">
      <p className="flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wide text-white/80">
        <Icon className="size-3.5" /> {t("drv.newInstr")} · {time(m.t)}
      </p>
      <p className="mt-2 text-[17px] font-semibold leading-snug">{t(m.key, m.vars)}</p>
      <button onClick={onAck} className="mt-3 flex h-12 w-full items-center justify-center gap-2 rounded-2xl bg-white text-base font-semibold text-accent active:scale-[0.99]">
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
      className="flex flex-col items-center gap-1.5 rounded-2xl bg-white/[0.08] px-1 py-3 text-[11px] font-medium leading-tight active:bg-white/15 disabled:opacity-30"
    >
      {icon}
      {label}
    </button>
  );
}
