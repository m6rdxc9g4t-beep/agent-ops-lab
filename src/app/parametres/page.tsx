"use client";

import { useState } from "react";
import { RotateCcw } from "lucide-react";
import { useSim, LOCALES } from "@/lib/store";
import type { IncidentLevel } from "@/lib/sim/types";
import { Button, Segmented, Toggle } from "@/components/ui";

function Row({ title, sub, children }: { title: string; sub?: string; children: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-2 py-3.5 sm:flex-row sm:items-center sm:justify-between sm:gap-6">
      <div className="min-w-0">
        <p className="text-sm font-medium">{title}</p>
        {sub && <p className="mt-0.5 text-xs text-muted">{sub}</p>}
      </div>
      <div className="shrink-0">{children}</div>
    </div>
  );
}

export default function SettingsPage() {
  const { settings, setSettings, engine, t, notify } = useSim();
  const [seed, setSeed] = useState(String(settings.seed));

  return (
    <div className="mx-auto max-w-3xl space-y-4 pt-1">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">{t("settings.title")}</h1>
        <p className="mt-1 text-sm text-muted">{t("settings.sub")}</p>
      </div>

      <section className="card px-4 py-1">
        <Row title={t("settings.language")} sub={t("settings.languageSub")}>
          <div className="grid grid-cols-2 gap-1.5 sm:grid-cols-4">
            {LOCALES.map((l) => (
              <button
                key={l.id}
                onClick={() => setSettings({ locale: l.id })}
                className={`flex items-center gap-1.5 rounded-xl border px-3 py-2 text-sm transition ${settings.locale === l.id ? "border-accent bg-accent-soft font-semibold text-accent" : "border-line hover:bg-[#f6f6f9]"}`}
              >
                <span>{l.flag}</span> {l.label}
              </button>
            ))}
          </div>
        </Row>
        <div className="border-t border-line" />
        <Row title={t("settings.operator")} sub={t("settings.operatorSub")}>
          <input
            value={settings.operatorName}
            onChange={(e) => setSettings({ operatorName: e.target.value.slice(0, 24) })}
            className="h-9 w-full rounded-xl border border-line px-3 text-sm outline-none focus:border-accent sm:w-56"
          />
        </Row>
      </section>

      <section className="card px-4 py-1">
        <p className="pt-3 text-[11px] font-semibold uppercase tracking-wide text-faint">{t("settings.sim")}</p>
        <Row title={t("settings.speed")} sub={settings.speed === 0 ? t("settings.speedPause") : t("settings.speedSub", { n: settings.speed })}>
          <Segmented<number>
            value={settings.speed}
            onChange={(v) => setSettings({ speed: v })}
            options={[0, 1, 10, 60, 300].map((v) => ({ id: v, label: v === 0 ? "❚❚" : `×${v}` }))}
          />
        </Row>
        <div className="border-t border-line" />
        <Row title={t("settings.incidents")} sub={t("settings.incidentsSub")}>
          <Segmented<IncidentLevel>
            value={settings.incidentLevel}
            onChange={(v) => setSettings({ incidentLevel: v })}
            options={(["calme", "normal", "chaotique"] as const).map((v) => ({ id: v, label: t(`level.${v}`) }))}
          />
        </Row>
      </section>

      <section className="card px-4 py-1">
        <p className="pt-3 text-[11px] font-semibold uppercase tracking-wide text-faint">{t("settings.agent")}</p>
        <Row title={t("settings.autoApprove")} sub={t("settings.autoApproveSub")}>
          <Toggle on={settings.autoApprove} onChange={(v) => setSettings({ autoApprove: v })} label={t("settings.autoApprove")} />
        </Row>
        <div className="border-t border-line" />
        <Row title={t("settings.threshold")} sub={`${Math.round(settings.autoThreshold * 100)} %`}>
          <input
            type="range"
            min={70}
            max={99}
            value={Math.round(settings.autoThreshold * 100)}
            onChange={(e) => setSettings({ autoThreshold: Number(e.target.value) / 100 })}
            className="w-full accent-[var(--accent)] sm:w-56"
          />
        </Row>
        <div className="border-t border-line" />
        <Row title={t("settings.minGain")} sub={t("common.min", { n: settings.minGainMin })}>
          <input
            type="range"
            min={5}
            max={60}
            step={5}
            value={settings.minGainMin}
            onChange={(e) => setSettings({ minGainMin: Number(e.target.value) })}
            className="w-full accent-[var(--accent)] sm:w-56"
          />
        </Row>
      </section>

      <section className="card px-4 py-1">
        <p className="pt-3 text-[11px] font-semibold uppercase tracking-wide text-faint">{t("settings.scenario")}</p>
        <Row title={t("settings.seed")} sub={t("settings.seedSub")}>
          <div className="flex gap-2">
            <input
              value={seed}
              inputMode="numeric"
              onChange={(e) => setSeed(e.target.value.replace(/\D/g, "").slice(0, 9))}
              className="tnum h-9 w-32 rounded-xl border border-line px-3 text-sm outline-none focus:border-accent"
            />
            <Button
              disabled={!seed || Number(seed) === settings.seed}
              onClick={() => {
                setSettings({ seed: Number(seed) });
                notify(t("settings.saved"));
              }}
            >
              OK
            </Button>
          </div>
        </Row>
        <div className="border-t border-line" />
        <Row title={t("settings.reset")} sub={t("settings.resetSub")}>
          <Button
            variant="dark"
            onClick={() => {
              engine.reset();
              notify(t("settings.reset"));
            }}
          >
            <RotateCcw className="size-4" /> {t("settings.reset")}
          </Button>
        </Row>
      </section>
    </div>
  );
}
