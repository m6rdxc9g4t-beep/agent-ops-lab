"use client";

import Link from "next/link";
import type { LogEntry, ShipEvent } from "@/lib/sim/types";
import { useSim } from "@/lib/store";

/** Journal discret : heure, pastille, texte. Seuls l'agent (signature), les alertes et les incidents sont colorés. */
const DOT = {
  info: "bg-line-strong",
  good: "bg-line-strong",
  warn: "bg-warn",
  bad: "bg-bad",
  agent: "bg-accent",
};

export function LogList({ items, empty }: { items: (LogEntry | ShipEvent)[]; empty?: string }) {
  const { t, time } = useSim();
  if (!items.length) return <p className="py-6 text-center text-sm text-muted">{empty ?? t("journal.empty")}</p>;
  return (
    <ol className="-my-1">
      {items.map((l, i) => {
        const sid = "shipmentId" in l ? l.shipmentId : undefined;
        const text = t(l.key, l.vars);
        const tone = l.tone ?? "info";
        return (
          <li key={"id" in l ? l.id : i} className="flex items-baseline gap-2.5 py-1">
            <span className="tnum w-9 shrink-0 text-xs text-faint">{time(l.t)}</span>
            <span className={`size-1.5 shrink-0 -translate-y-px rounded-full ${DOT[tone]}`} aria-hidden />
            <p className={`min-w-0 flex-1 text-sm leading-snug ${tone === "bad" ? "text-ink" : "text-ink-2"}`}>
              {sid ? (
                <Link href={`/expeditions/${sid}`} className="hover:text-ink hover:underline">
                  {text}
                </Link>
              ) : (
                text
              )}
            </p>
          </li>
        );
      })}
    </ol>
  );
}
