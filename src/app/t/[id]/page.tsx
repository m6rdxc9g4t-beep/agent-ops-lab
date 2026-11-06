"use client";

import { useParams } from "next/navigation";
import { Check, Eye, Package, ShieldCheck, Truck, MapPin, PauseCircle } from "lucide-react";
import { useSim } from "@/lib/store";
import { HUBS, edgeBetween, pathKm } from "@/lib/sim/network";
import type { Shipment } from "@/lib/sim/types";
import { MapView } from "@/components/MapView";
import { TempChart } from "@/components/TempChart";
import { Avatar } from "@/components/ui";
import { BrandTile } from "@/components/AppShell";

export default function CustomerTracking() {
  const { id } = useParams<{ id: string }>();
  const { state, engine, t, time } = useSim();
  const sid = decodeURIComponent(id).toUpperCase();
  const s = engine.ship(sid);
  const only = (x: Shipment) => x.id === sid;

  if (!s)
    return (
      <div className="grid min-h-screen place-items-center p-6 text-center">
        <div>
          <Package className="mx-auto size-7 text-faint" aria-hidden />
          <p className="mt-3 text-sm text-muted">{t("trk.notFound")}</p>
        </div>
      </div>
    );

  const eta = engine.eta(s);
  const delivered = s.phase === "delivered";
  const lateBy = Math.ceil(eta - s.windowEnd);
  const total = pathKm(s.path);
  let done = 0;
  for (let i = 0; i < s.legIndex && i < s.path.length - 1; i++) done += edgeBetween(s.path[i], s.path[i + 1]).km;
  done += s.legKm;
  const near = !delivered && s.phase !== "planned" && (total - done < 40 || eta - state.now < 45);
  const step = delivered ? 3 : near ? 2 : s.phase === "planned" ? 0 : 1;
  const share = s.share ?? { temp: s.setpointC !== undefined, driver: false, sentAt: -1, to: "" };
  const steps = [
    { label: t("trk.step.prepared"), icon: Package },
    { label: t("trk.step.onroad"), icon: Truck },
    { label: t("trk.step.near"), icon: MapPin },
    { label: t("trk.step.delivered"), icon: Check },
  ];

  return (
    <div className="min-h-screen bg-[var(--bg)]">
      {!s.share && (
        <div className="flex items-center justify-center gap-2 border-b border-line bg-accent-soft px-3 py-2 text-center text-xs font-medium text-accent-text">
          <Eye className="size-3.5 shrink-0" aria-hidden /> {t("trk.preview")}
        </div>
      )}
      <div className="mx-auto max-w-2xl space-y-3 px-3 py-5 sm:py-8">
        <header className="flex items-center gap-2.5 px-1">
          <BrandTile />
          <div>
            <p className="text-sm font-semibold">{t("app.name")}</p>
            <p className="text-xs text-muted">{t("trk.brand")}</p>
          </div>
        </header>

        <section className="card p-5">
          <p className="tnum text-xs text-muted">{t("trk.for", { id: s.id, client: s.client })}</p>
          <h1 className="mt-1 text-2xl font-semibold tracking-[-0.012em]">{t("trk.title")}</h1>

          <div className="mt-4 grid grid-cols-2 gap-3">
            <div>
              <p className="text-xs text-muted">{delivered ? t("trk.step.delivered") : t("trk.eta")}</p>
              <p className="tnum text-[32px] font-semibold leading-tight tracking-[-0.02em]">{time(delivered ? s.deliveredAt ?? eta : eta)}</p>
            </div>
            <div>
              <p className="text-xs text-muted">{t("trk.window")}</p>
              <p className="tnum text-xl font-semibold">{time(s.windowStart)} – {time(s.windowEnd)}</p>
            </div>
          </div>

          {!delivered && (
            <p className={`mt-3 rounded-xl px-3 py-2 text-sm font-medium ${lateBy > 0 && s.phase !== "planned" ? "bg-warn-soft text-warn" : "bg-hover text-ink-2"}`}>
              {s.phase === "planned" ? t("trk.planned", { t: time(s.departAt) }) : lateBy > 0 ? t("trk.late", { n: lateBy }) : t("trk.onTime")}
            </p>
          )}
          {s.phase === "stopped" && (
            <p className="mt-2 flex items-center gap-1.5 text-xs text-muted"><PauseCircle className="size-3.5" aria-hidden /> {t("trk.stopped")}</p>
          )}

          {/* étapes */}
          <ol className="mt-5 grid grid-cols-4">
            {steps.map((st, i) => {
              const Icon = st.icon;
              const on = i <= step;
              return (
                <li key={st.label} className="relative flex flex-col items-center text-center">
                  {i > 0 && <span className={`absolute right-1/2 top-3.5 h-px w-full ${i <= step ? "bg-accent" : "bg-line-strong"}`} />}
                  <span className={`relative grid size-7 place-items-center rounded-full ${on ? "bg-accent text-accent-ink" : "border border-line-strong bg-card text-faint"}`} aria-hidden>
                    <Icon className="size-3.5" />
                  </span>
                  <span className={`mt-1.5 text-xs leading-tight ${i === step ? "font-semibold text-ink" : on ? "text-ink-2" : "text-muted"}`} aria-current={i === step ? "step" : undefined}>{st.label}</span>
                </li>
              );
            })}
          </ol>
        </section>

        {!delivered && <MapView selectedId={s.phase === "planned" ? null : s.id} filter={only} proposals="none" minimal className="h-[300px] sm:h-[360px]" />}

        {share.temp && s.setpointC !== undefined && (
          <section className="card p-4">
            <p className="mb-2 text-sm font-semibold">{t("trk.temp")}</p>
            <TempChart s={s} height={110} />
          </section>
        )}

        {share.driver && (
          <section className="card flex items-center gap-3 p-4">
            <Avatar name={s.driver.name} size={40} />
            <div>
              <p className="text-xs text-muted">{t("trk.driver")}</p>
              <p className="text-sm font-semibold">{s.driver.name}</p>
              <p className="text-xs text-muted">{s.driver.phone}</p>
            </div>
          </section>
        )}

        <footer className="space-y-1 px-1 pt-1 text-xs text-faint">
          <p className="flex items-center gap-1.5"><ShieldCheck className="size-3.5" aria-hidden /> {t("trk.privacy")}</p>
          <p>{HUBS[s.origin].name} → {HUBS[s.destination].name} · {t("trk.updated", { t: time(state.now) })}</p>
          <p>{t("trk.contact")}</p>
        </footer>
      </div>
    </div>
  );
}
