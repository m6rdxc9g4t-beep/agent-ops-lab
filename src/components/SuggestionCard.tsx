"use client";

import Link from "next/link";
import { Mail, Route, Snowflake } from "lucide-react";
import type { Suggestion } from "@/lib/sim/types";
import { useSim } from "@/lib/store";
import { describeSuggestion } from "@/lib/describe";
import { Button, Pill } from "./ui";

const ICON = { reroute: Route, notify: Mail, reefer: Snowflake };

export function SuggestionCard({ g, onFocus, active }: { g: Suggestion; index?: number; onFocus?: (shipmentId: string) => void; active?: boolean }) {
  const { engine, t, time, setReview } = useSim();
  const d = describeSuggestion(g, engine, t, time);
  const Icon = ICON[g.type];
  const pending = g.status === "pending";
  return (
    <div
      onClick={() => onFocus?.(g.shipmentId)}
      className={`rounded-2xl border p-3 transition-colors ${active ? "border-[color-mix(in_oklab,var(--accent)_45%,transparent)] bg-accent-faint" : "border-line bg-card"} ${onFocus && !active ? "cursor-pointer hover:border-line-strong" : onFocus ? "cursor-pointer" : ""}`}
    >
      <div className="flex items-start gap-2.5">
        <span className={`grid size-6 shrink-0 place-items-center rounded-md ${pending ? "bg-accent-soft text-accent-text" : "bg-hover text-faint"}`} aria-hidden>
          <Icon className="size-3.5" strokeWidth={1.9} />
        </span>
        <div className="min-w-0 flex-1">
          <p className={`text-sm font-semibold leading-snug ${pending ? "" : "text-ink-2"}`}>{d.title}</p>
          <p className="mt-0.5 text-xs leading-normal text-muted">{d.why}</p>
          <div className="mt-2 flex flex-wrap items-center gap-1">
            {g.reroute && <Pill tone="ok">{t("sug.gain", { n: g.reroute.gainMin })}</Pill>}
            {g.notify && <Pill tone="bad">+{t("common.min", { n: g.notify.delayMin })}</Pill>}
            {g.reefer && <Pill tone="warn">{t("common.celsius", { n: g.reefer.tempC.toFixed(1) })}</Pill>}
            <Pill>{t("sug.confidence", { n: Math.round(g.confidence * 100) })}</Pill>
            <Link href={`/expeditions/${g.shipmentId}`} onClick={(e) => e.stopPropagation()} className="tnum ml-0.5 text-xs font-medium text-muted hover:text-ink hover:underline">
              {g.shipmentId}
            </Link>
          </div>
          {pending ? (
            <div className="mt-2.5 flex flex-wrap gap-1" onClick={(e) => e.stopPropagation()}>
              <Button size="sm" variant="dark" onClick={() => setReview(g.id)}>{t("sug.approve")}</Button>
              <Button size="sm" onClick={() => setReview(g.id)}>{t("sug.review")}</Button>
              <Button size="sm" variant="ghost" onClick={() => engine.reject(g.id)}>{t("sug.dismiss")}</Button>
            </div>
          ) : (
            <p className="tnum mt-1.5 text-xs text-faint">
              {g.status === "auto" && t("sug.auto")}
              {g.status === "approved" && t("sug.approvedBy", { by: g.resolvedBy ?? "" })}
              {g.status === "rejected" && t("sug.rejectedBy", { by: g.resolvedBy ?? "" })}
              {g.status === "expired" && t("sug.expired")}
              {g.resolvedAt !== undefined && ` · ${time(g.resolvedAt)}`}
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
