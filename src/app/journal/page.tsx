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
    <div className="mx-auto max-w-3xl space-y-4 pt-1">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">{t("journal.title")}</h1>
        <p className="mt-1 text-sm text-muted">{t("journal.sub")}</p>
      </div>
      <Segmented<F>
        value={f}
        onChange={setF}
        options={[
          { id: "all", label: t("journal.all") },
          { id: "agent", label: t("journal.agent") },
          { id: "incidents", label: t("journal.incidents") },
          { id: "deliveries", label: t("journal.deliveries") },
        ]}
      />
      <div className="card p-4">
        <LogList items={items.slice(0, 150)} />
      </div>
    </div>
  );
}
