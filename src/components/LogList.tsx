"use client";

import Link from "next/link";
import type { LogEntry, ShipEvent } from "@/lib/sim/types";
import { useSim } from "@/lib/store";

const TONE = {
  info: "#a3a3b2",
  good: "#14a05a",
  warn: "#d98b00",
  bad: "#e5484d",
  agent: "#6b46ff",
};

export function LogList({ items, empty }: { items: (LogEntry | ShipEvent)[]; empty?: string }) {
  const { t, time } = useSim();
  if (!items.length) return <p className="py-6 text-center text-sm text-muted">{empty ?? t("journal.empty")}</p>;
  return (
    <ol className="relative">
      {items.map((l, i) => {
        const sid = "shipmentId" in l ? l.shipmentId : undefined;
        const text = t(l.key, l.vars);
        return (
          <li key={"id" in l ? l.id : i} className="relative flex gap-3 pb-3 pl-1">
            {i < items.length - 1 && <span className="absolute left-[8px] top-4 h-full w-px bg-line" />}
            <span className="relative mt-1.5 size-2.5 shrink-0 rounded-full ring-4 ring-white" style={{ background: TONE[l.tone ?? "info"] }} />
            <div className="min-w-0 flex-1">
              <p className="text-[13px] leading-snug">
                {sid ? (
                  <Link href={`/expeditions/${sid}`} className="hover:underline">
                    {text}
                  </Link>
                ) : (
                  text
                )}
              </p>
              <p className="tnum text-[11px] text-faint">{time(l.t)}</p>
            </div>
          </li>
        );
      })}
    </ol>
  );
}
