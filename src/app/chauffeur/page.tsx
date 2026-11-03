"use client";

import Link from "next/link";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { useSim, sortByUrgency } from "@/lib/store";
import { HUBS } from "@/lib/sim/network";
import { PhoneFrame } from "@/components/PhoneFrame";
import { Avatar, StatusPill } from "@/components/ui";

export default function DriverPicker() {
  const { state, engine, t, time } = useSim();
  const list = sortByUrgency(
    engine,
    state.shipments.filter((s) => s.phase !== "delivered"),
  );

  return (
    <PhoneFrame>
      <header className="bg-ink px-5 pb-6 pt-5 text-white">
        <Link href="/" className="inline-flex items-center gap-1 text-xs text-white/60 hover:text-white">
          <ChevronLeft className="size-3.5" /> {t("drv.backOffice")}
        </Link>
        <h1 className="mt-3 text-2xl font-semibold">{t("drv.title")}</h1>
        <p className="mt-1 text-sm text-white/60">{t("drv.pick")}</p>
        <p className="tnum mt-3 text-xs text-white/40">{time(state.now)}</p>
      </header>
      <div className="-mt-3 flex-1 space-y-2 rounded-t-3xl bg-[var(--bg)] p-3">
        {list.map((s) => {
          const unread = s.inbox.filter((m) => m.ackAt === undefined && m.kind !== "dispatch" && m.kind !== "notified").length;
          return (
            <Link key={s.id} href={`/chauffeur/${s.id}`} className="card flex items-center gap-3 p-3 active:scale-[0.99]">
              <Avatar name={s.driver.name} size={40} />
              <div className="min-w-0 flex-1">
                <p className="flex items-center gap-2 text-sm font-semibold">
                  {s.driver.name}
                  {unread > 0 && <span className="grid size-5 place-items-center rounded-full bg-accent text-[10px] font-bold text-white">{unread}</span>}
                </p>
                <p className="truncate text-xs text-muted">{s.id} · {HUBS[s.origin].name} → {HUBS[s.destination].name}</p>
                <div className="mt-1"><StatusPill health={engine.health(s)} /></div>
              </div>
              <ChevronRight className="size-4 text-faint" />
            </Link>
          );
        })}
        {list.length === 0 && <p className="p-4 text-center text-sm text-muted">{t("drv.none")}</p>}
      </div>
    </PhoneFrame>
  );
}
