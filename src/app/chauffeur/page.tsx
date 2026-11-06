"use client";

import Link from "next/link";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { useSim, sortByUrgency } from "@/lib/store";
import { HUBS } from "@/lib/sim/network";
import { PhoneFrame } from "@/components/PhoneFrame";
import { Avatar, StatusPill } from "@/components/ui";
import { BrandTile } from "@/components/AppShell";

export default function DriverPicker() {
  const { state, engine, t, time } = useSim();
  const list = sortByUrgency(
    engine,
    state.shipments.filter((s) => s.phase !== "delivered"),
  );

  return (
    <PhoneFrame>
      <header className="border-b border-line px-4 pb-4 pt-4">
        <Link href="/" className="inline-flex items-center gap-1 text-xs text-muted hover:text-ink">
          <ChevronLeft className="size-3.5" aria-hidden /> {t("drv.backOffice")}
        </Link>
        <div className="mt-3 flex items-center gap-2.5">
          <BrandTile />
          <h1 className="text-xl font-semibold">{t("drv.title")}</h1>
          <span className="tnum ml-auto rounded-md border border-line bg-card px-2 py-1 text-xs font-semibold">{time(state.now)}</span>
        </div>
        <p className="mt-1.5 text-sm text-muted">{t("drv.pick")}</p>
      </header>
      <ul className="flex-1">
        {list.map((s) => {
          const unread = s.inbox.filter((m) => m.ackAt === undefined && m.kind !== "dispatch" && m.kind !== "notified").length;
          return (
            <li key={s.id} className="border-b border-line">
              <Link href={`/chauffeur/${s.id}`} className="flex items-center gap-3 px-4 py-2.5 transition-colors hover:bg-hover active:bg-selected">
                <Avatar name={s.driver.name} size={32} />
                <div className="min-w-0 flex-1">
                  <p className="flex items-center gap-2 text-sm font-medium">
                    <span className="truncate">{s.driver.name}</span>
                    {unread > 0 && (
                      <span className="tnum grid h-4 min-w-4 place-items-center rounded-full bg-accent px-1 text-[10px] font-semibold text-accent-ink">{unread}</span>
                    )}
                  </p>
                  <p className="tnum truncate text-xs text-muted">
                    {s.id} · {HUBS[s.origin].name} → {HUBS[s.destination].name}
                  </p>
                </div>
                <StatusPill health={engine.health(s)} />
                <ChevronRight className="size-4 shrink-0 text-faint" aria-hidden />
              </Link>
            </li>
          );
        })}
        {list.length === 0 && <li className="p-6 text-center text-sm text-muted">{t("drv.none")}</li>}
      </ul>
    </PhoneFrame>
  );
}
