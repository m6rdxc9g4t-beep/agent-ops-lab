import { EDGES, HUBS, pathRoads } from "./sim/network";
import type { SimEngine } from "./sim/engine";
import type { Suggestion } from "./sim/types";
import type { T } from "./store";

export function describeSuggestion(g: Suggestion, engine: SimEngine, t: T, time: (m: number) => string) {
  const s = engine.ship(g.shipmentId);
  if (!s) return { title: g.shipmentId, why: "" };
  if (g.type === "reroute" && g.reroute) {
    const r = g.reroute;
    const roads = pathRoads(r.proposedPath).join(" · ");
    const title = t("sug.reroute.title", { id: s.id, via: t("common.via", { roads }) });
    const inc = engine.state.incidents.find((i) => i.id === r.incidentId);
    if (inc) {
      const e = EDGES.find((x) => x.id === inc.edgeId)!;
      return {
        title,
        why: t("sug.reroute.why", {
          kind: inc.kind,
          road: e.road,
          from: HUBS[e.a].name,
          to: HUBS[e.b].name,
          cur: time(r.currentEta),
          prop: time(r.proposedEta),
        }),
      };
    }
    return { title, why: t("sug.reroute.whyNoIncident", { cur: time(r.currentEta), prop: time(r.proposedEta) }) };
  }
  if (g.type === "notify" && g.notify) {
    return {
      title: t("sug.notify.title", { client: s.client, id: s.id }),
      why: t("sug.notify.why", { end: time(s.windowEnd), eta: time(g.notify.newEta), delay: g.notify.delayMin }),
    };
  }
  if (g.type === "reefer" && g.reefer) {
    return {
      title: t("sug.reefer.title", { id: s.id }),
      why: t("sug.reefer.why", {
        temp: t("common.celsius", { n: g.reefer.tempC.toFixed(1) }),
        set: t("common.celsius", { n: g.reefer.setpointC }),
        driver: s.driver.name,
      }),
    };
  }
  return { title: s.id, why: "" };
}
