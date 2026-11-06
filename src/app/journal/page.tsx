"use client";

import { useState } from "react";
import { useSim } from "@/lib/store";
import { LogList } from "@/components/LogList";
import { Segmented } from "@/components/ui";

type F = "all" | "agent" | "incidents" | "deliveries";

export default function Journal() {
  const { state, t } = useSim();
  const [f, setF] = useState<F>("all");
  const items = state.log.filter((l) => {
    if (f === "agent") return l.key.startsWith("log.sug") || ["log.rerouted", "log.autoRerouted", "log.notified", "log.reeferCheck", "log.rejected", "log.expired"].includes(l.key);
    if (f === "incidents") return ["log.incident", "log.incidentCleared", "log.breakdown", "log.reeferDrift"].includes(l.key);
    if (f === "deliveries") return l.key.startsWith("log.delivered") || l.key === "log.departed" || l.key === "log.newShipment";
    return true;
  });
  return (
    <div className="mx-auto max-w-3xl space-y-3">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h2 className="text-lg font-semibold">{t("journal.title")}</h2>
          <p className="mt-0.5 text-sm text-muted">{t("journal.sub")}</p>
        </div>
        <Segmented<F>
          value={f}
          label={t("journal.title")}
          onChange={setF}
          options={[
            { id: "all", label: t("journal.all") },
            { id: "agent", label: t("journal.agent") },
            { id: "incidents", label: t("journal.incidents") },
            { id: "deliveries", label: t("journal.deliveries") },
          ]}
        />
      </div>
      <div className="card px-4 py-3">
        <LogList items={items.slice(0, 150)} />
      </div>
    </div>
  );
}
