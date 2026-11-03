"use client";

import Link from "next/link";
import { Mail, Route, Snowflake } from "lucide-react";
import type { Suggestion } from "@/lib/sim/types";
import { useSim } from "@/lib/store";
import { describeSuggestion } from "@/lib/describe";
import { Button, Pill } from "./ui";

const ICON = { reroute: Route, notify: Mail, reefer: Snowflake };

export function SuggestionCard({ g, index, onFocus, active }: { g: Suggestion; index?: number; onFocus?: (shipmentId: string) => void; active?: boolean }) {
  const { engine, t, time, setReview } = useSim();
  const d = describeSuggestion(g, engine, t, time);
  const Icon = ICON[g.type];
  const pending = g.status === "pending";
  return (
    <div
      onClick={() => onFocus?.(g.shipmentId)}
      className={`rounded-2xl border p-3 transition ${active ? "border-accent bg-accent-soft/30" : "border-line bg-white"} ${onFocus ? "cursor-pointer hover:border-[#d5d0f5]" : ""} ${pending ? "" : "opacity-70"}`}
    >
      <div className="flex items-start gap-2.5">
        <span className="grid size-7 shrink-0 place-items-center rounded-full bg-accent-soft text-[11px] font-bold text-accent">
          {index !== undefined ? String(index + 1).padStart(2, "0") : <Icon className="size-3.5" />}
        </span>
        <div className="min-w-0 flex-1">
          <p className="text-[13px] font-semibold leading-snug">{d.title}</p>
          <p className="mt-1 text-xs leading-relaxed text-muted">{d.why}</p>
          <div className="mt-2 flex flex-wrap items-center gap-1.5">
            {g.reroute && <Pill tone="ok">{t("sug.gain", { n: g.reroute.gainMin })}</Pill>}
            {g.notify && <Pill tone="bad">+{t("common.min", { n: g.notify.delayMin })}</Pill>}
            {g.reefer && <Pill tone="warn">{t("common.celsius", { n: g.reefer.tempC.toFixed(1) })}</Pill>}
            <Pill>{t("sug.confidence", { n: Math.round(g.confidence * 100) })}</Pill>
            <Link href={`/expeditions/${g.shipmentId}`} onClick={(e) => e.stopPropagation()} className="text-[11px] font-medium text-muted underline-offset-2 hover:underline">
              {g.shipmentId}
            </Link>
          </div>
          {pending ? (
            <div className="mt-2.5 flex flex-wrap gap-1.5" onClick={(e) => e.stopPropagation()}>
              <Button size="sm" variant="dark" onClick={() => setReview(g.id)}>{t("sug.approve")}</Button>
              <Button size="sm" onClick={() => setReview(g.id)}>{t("sug.review")}</Button>
              <Button size="sm" variant="ghost" onClick={() => engine.reject(g.id)}>{t("sug.dismiss")}</Button>
            </div>
          ) : (
            <p className="mt-2 text-[11px] font-medium text-muted">
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
