"use client";

import Link from "next/link";
import { useState } from "react";
import { Bot, Check, ShieldCheck, Snowflake, Mail } from "lucide-react";
import { useSim } from "@/lib/store";
import { pathKm, pathRoads } from "@/lib/sim/network";
import { describeSuggestion } from "@/lib/describe";
import { Modal } from "./Modal";
import { Button, Pill } from "./ui";
import { TempChart } from "./TempChart";

export function ReviewModal() {
  const { review, setReview, state, engine, t, time, dur, notify } = useSim();
  const g = state.suggestions.find((x) => x.id === review);
  const s = g ? engine.ship(g.shipmentId) : undefined;
  const [draft, setDraft] = useState<{ id: string; text: string } | null>(null);
  const close = () => setReview(null);
  if (!g || !s) return null;
  const done = g.status !== "pending";
  const d = describeSuggestion(g, engine, t, time);

  const approve = () => {
    engine.approve(g.id);
    notify(t("sug.approvedBy", { by: engine.settings.operatorName }));
    close();
  };
  const reject = () => {
    engine.reject(g.id);
    close();
  };

  const header = (icon: React.ReactNode, title: string) => (
    <div className="pr-8">
      <Pill tone="accent" className="mb-3">
        <Bot className="size-3" /> {t("common.agentName")} · {t("sug.confidence", { n: Math.round(g.confidence * 100) })}
      </Pill>
      <h3 className="flex items-center gap-2 text-lg font-semibold">
        {icon}
        {title}
      </h3>
    </div>
  );

  const footer = (primary: string) => (
    <>
      <p className="mt-4 flex items-start gap-2 rounded-xl bg-[#f6f6f9] p-3 text-xs text-muted">
        <ShieldCheck className="mt-px size-3.5 shrink-0" /> {t("modal.audit")}
      </p>
      <div className="mt-4 flex flex-wrap items-center justify-end gap-2">
        {done ? (
          <Pill>{g.status === "expired" ? t("sug.expired") : g.status === "auto" ? t("sug.auto") : g.status === "approved" ? t("sug.approvedBy", { by: g.resolvedBy ?? "" }) : t("sug.rejectedBy", { by: g.resolvedBy ?? "" })}</Pill>
        ) : (
          <>
            <Button variant="ghost" onClick={reject}>{t("modal.reject")}</Button>
            <Link href={`/expeditions/${s.id}`} onClick={close}>
              <Button>{t("sug.review")}</Button>
            </Link>
            <Button variant="dark" onClick={approve}>
              <Check className="size-4" /> {primary}
            </Button>
          </>
        )}
      </div>
    </>
  );

  if (g.type === "reroute" && g.reroute) {
    const r = g.reroute;
    const curLate = r.currentEta > s.windowEnd;
    const propLate = r.proposedEta > s.windowEnd;
    const fromRoads = pathRoads(r.currentPath).join(" · ");
    const toRoads = pathRoads(r.proposedPath).join(" · ");
    const extra = Math.round(pathKm(r.proposedPath) - pathKm(r.currentPath));
    return (
      <Modal open onClose={close} width={520} label={t("modal.reroute.title")}>
        {header(null, t("modal.reroute.title"))}
        <p className="mt-2 text-sm text-muted">
          {curLate
            ? t("modal.reroute.desc", { id: s.id, fromRoads, toRoads, delay: Math.round(r.currentEta - s.windowEnd) })
            : t("modal.reroute.descOk", { id: s.id, fromRoads, toRoads })}
        </p>
        <p className="mt-1 text-xs text-faint">{d.why}</p>

        <div className="mt-4 grid grid-cols-2 gap-2">
          <div className="rounded-2xl border border-line p-3">
            <p className="truncate text-[11px] text-muted">{t("modal.current", { roads: fromRoads })}</p>
            <p className="tnum mt-1 text-2xl font-semibold">{time(r.currentEta)}</p>
            <p className="text-[11px] text-muted">{dur(r.currentEta - engine.state.now)}</p>
            <Pill tone={curLate ? "bad" : "ok"} className="mt-2">{curLate ? t("sug.missesWindow") : t("sug.inWindow")}</Pill>
          </div>
          <div className="rounded-2xl border-2 border-accent bg-accent-soft/40 p-3">
            <p className="truncate text-[11px] text-accent">{t("modal.proposed", { roads: toRoads })}</p>
            <p className="tnum mt-1 text-2xl font-semibold">{time(r.proposedEta)}</p>
            <p className="text-[11px] text-muted">{dur(r.proposedEta - engine.state.now)}</p>
            <Pill tone={propLate ? "bad" : "ok"} className="mt-2">{propLate ? t("sug.missesWindow") : t("sug.inWindow")}</Pill>
          </div>
        </div>

        <dl className="mt-4 divide-y divide-line text-sm">
          {[
            [t("modal.impact"), t("modal.arrivesEarlier", { n: r.gainMin })],
            [t("modal.extraDistance"), `${extra >= 0 ? "+" : "−"}${t("common.km", { n: Math.abs(extra) })}`],
            [
              t("modal.customer"),
              propLate
                ? t("modal.customerKo", { n: Math.round(r.proposedEta - s.windowEnd) })
                : t("modal.customerOk", { start: time(s.windowStart), end: time(s.windowEnd) }),
            ],
            [t("modal.driver"), t("modal.driverInfo", { name: s.driver.name, left: dur(s.drivingLeftMin) })],
          ].map(([k, v]) => (
            <div key={k} className="flex justify-between gap-4 py-2">
              <dt className="text-muted">{k}</dt>
              <dd className="text-right font-medium">{v}</dd>
            </div>
          ))}
        </dl>
        {footer(t("modal.approveAction"))}
      </Modal>
    );
  }

  if (g.type === "notify" && g.notify) {
    const text =
      draft?.id === g.id
        ? draft.text
        : t("sug.notify.draft", {
            contact: s.contact.name.split(" ")[0],
            id: s.id,
            eta: time(g.notify.newEta),
            start: time(s.windowStart),
            end: time(s.windowEnd),
          });
    return (
      <Modal open onClose={close} width={500} label={t("modal.notify.title")}>
        {header(<Mail className="size-5 text-accent" />, t("modal.notify.title"))}
        <p className="mt-2 text-sm text-muted">{d.why}</p>
        <p className="mt-4 text-xs font-medium text-muted">{t("modal.notify.to", { name: s.contact.name, role: s.contact.role })} · {s.contact.email}</p>
        <textarea
          value={text}
          onChange={(e) => setDraft({ id: g.id, text: e.target.value })}
          disabled={done}
          rows={6}
          className="mt-2 w-full resize-none rounded-2xl border border-line p-3 text-sm leading-relaxed outline-none focus:border-accent"
        />
        {footer(t("modal.notify.send"))}
      </Modal>
    );
  }

  if (g.type === "reefer" && g.reefer) {
    const etaAfter = engine.eta(s) + 20;
    return (
      <Modal open onClose={close} width={500} label={t("modal.reefer.title")}>
        {header(<Snowflake className="size-5 text-accent" />, t("modal.reefer.title"))}
        <p className="mt-2 text-sm text-muted">{d.why}</p>
        <div className="mt-4 rounded-2xl border border-line p-3">
          <TempChart s={s} height={110} />
        </div>
        <p className="mt-3 text-sm">{t("modal.reefer.desc", { driver: s.driver.name, id: s.id, eta: time(etaAfter) })}</p>
        {footer(t("modal.approveAction"))}
      </Modal>
    );
  }
  return null;
}
