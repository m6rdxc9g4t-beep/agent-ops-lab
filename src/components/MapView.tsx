"use client";

import { useEffect, useRef, useState } from "react";
import type { Map as MlMap, Marker, StyleSpecification, GeoJSONSource, LngLatBoundsLike } from "maplibre-gl";
import { useSim } from "@/lib/store";
import { EDGES, HUBS, pathCoords } from "@/lib/sim/network";
import type { Shipment } from "@/lib/sim/types";
import { HEALTH_COLOR, HEALTH_HEX } from "./ui";

const REMOTE_STYLE = "https://tiles.openfreemap.org/styles/positron";
const FRANCE: LngLatBoundsLike = [
  [-4.9, 42.2],
  [8.4, 51.2],
];

// contour très simplifié de la France, utilisé si les tuiles distantes sont inaccessibles
const FRANCE_OUTLINE: [number, number][] = [
  [-1.79, 43.37], [-1.25, 44.6], [-1.17, 45.6], [-1.15, 46.16], [-2.1, 46.8], [-2.5, 47.3], [-4.37, 47.8], [-4.8, 48.4],
  [-4.0, 48.7], [-3.0, 48.8], [-1.6, 48.65], [-1.9, 49.7], [-1.25, 49.65], [-1.1, 49.35], [0.2, 49.45], [1.4, 50.05],
  [1.6, 50.9], [2.55, 51.08], [3.2, 50.75], [4.2, 50.3], [4.8, 50.0], [5.8, 49.55], [6.4, 49.45], [7.5, 49.1],
  [8.2, 48.97], [7.6, 47.6], [6.9, 47.4], [6.1, 46.4], [6.8, 45.9], [7.0, 45.3], [6.6, 45.1], [7.0, 44.2],
  [7.5, 43.8], [6.7, 43.15], [5.9, 43.1], [5.0, 43.4], [3.9, 43.5], [3.1, 43.1], [3.15, 42.45], [1.7, 42.5],
  [0.7, 42.85], [-0.3, 42.8], [-1.4, 43.05], [-1.79, 43.37],
];

const FALLBACK_STYLE: StyleSpecification = {
  version: 8,
  sources: {
    fr: { type: "geojson", data: { type: "Feature", properties: {}, geometry: { type: "Polygon", coordinates: [FRANCE_OUTLINE] } } },
  },
  layers: [
    { id: "bg", type: "background", paint: { "background-color": "#dfe7ef" } },
    { id: "fr-fill", type: "fill", source: "fr", paint: { "fill-color": "#f7f7f5" } },
    { id: "fr-line", type: "line", source: "fr", paint: { "line-color": "#c9d2dc", "line-width": 1 } },
  ],
};

const TRUCK_SVG =
  '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"><path d="M14 18V6a2 2 0 0 0-2-2H4a2 2 0 0 0-2 2v11a1 1 0 0 0 1 1h2"/><path d="M15 18H9"/><path d="M19 18h2a1 1 0 0 0 1-1v-3.65a1 1 0 0 0-.22-.624l-3.48-4.35A1 1 0 0 0 17.52 8H14"/><circle cx="17" cy="18" r="2"/><circle cx="7" cy="18" r="2"/></svg>';

type FC = GeoJSON.FeatureCollection;

interface Props {
  selectedId?: string | null;
  onSelect?: (id: string) => void;
  filter?: (s: Shipment) => boolean;
  proposals?: "all" | "selected" | "none";
  className?: string;
  labels?: boolean;
  /** Vue client : pas d'incidents, pas de légende interne, couleur de marque unique. */
  minimal?: boolean;
}

export function MapView({ selectedId = null, onSelect, filter, proposals = "all", className = "", labels = false, minimal = false }: Props) {
  const { state, engine, t } = useSim();
  const box = useRef<HTMLDivElement>(null);
  const mapRef = useRef<MlMap | null>(null);
  const markers = useRef(new Map<string, { m: Marker; el: HTMLDivElement }>());
  const incMarkers = useRef(new Map<string, Marker>());
  const mlRef = useRef<typeof import("maplibre-gl") | null>(null);
  const [ready, setReady] = useState(0);
  const [offline, setOffline] = useState(false);
  const selectRef = useRef(onSelect);
  useEffect(() => {
    selectRef.current = onSelect;
  }, [onSelect]);

  // création de la carte
  useEffect(() => {
    let cancelled = false;
    let fallbackTimer: ReturnType<typeof setTimeout> | undefined;
    (async () => {
      const ml = await import("maplibre-gl");
      if (cancelled || !box.current) return;
      mlRef.current = ml;
      ml.setWorkerUrl(new URL("/maplibre-gl-worker.mjs", window.location.origin).href);
      const map = new ml.Map({
        container: box.current,
        style: REMOTE_STYLE,
        bounds: FRANCE,
        fitBoundsOptions: { padding: 20 },
        attributionControl: { compact: true },
        cooperativeGestures: false,
        dragRotate: false,
        pitchWithRotate: false,
      });
      mapRef.current = map;
      map.addControl(new ml.NavigationControl({ showCompass: false }), "top-right");
      let loaded = false;
      const goOffline = () => {
        if (loaded || cancelled) return;
        loaded = true;
        setOffline(true);
        map.setStyle(FALLBACK_STYLE);
      };
      fallbackTimer = setTimeout(goOffline, 6000);
      map.on("error", (e) => {
        const msg = String(e.error?.message ?? "");
        if (!map.isStyleLoaded() && !loaded) goOffline();
        else if (msg) console.debug("[map]", msg);
      });
      map.on("style.load", () => {
        if (map.getStyle()?.name || map.getLayer("fr-fill")) loaded = true;
        clearTimeout(fallbackTimer);
        addLayers(map);
        setReady((n) => n + 1);
      });
    })();
    const ro = new ResizeObserver(() => mapRef.current?.resize());
    if (box.current) ro.observe(box.current);
    const mk = markers.current;
    const im = incMarkers.current;
    return () => {
      cancelled = true;
      clearTimeout(fallbackTimer);
      ro.disconnect();
      mk.forEach(({ m }) => m.remove());
      mk.clear();
      im.forEach((m) => m.remove());
      im.clear();
      mapRef.current?.remove();
      mapRef.current = null;
    };
  }, []);

  // mise à jour des données à chaque tick
  useEffect(() => {
    const map = mapRef.current;
    const ml = mlRef.current;
    if (!map || !ml || !ready || !map.getSource("routes")) return;

    const visible = state.shipments.filter((s) => s.phase !== "delivered" && (!filter || filter(s)));
    const routes: FC = { type: "FeatureCollection", features: [] };
    for (const s of visible) {
      const pos = engine.position(s);
      const h = engine.health(s);
      const coords = s.phase === "planned" ? pathCoords(s.path) : [[pos.lng, pos.lat] as [number, number], ...pathCoords(s.path.slice(s.legIndex + 1))];
      const sel = s.id === selectedId;
      if (!selectedId || sel || s.phase !== "planned")
        routes.features.push({
          type: "Feature",
          properties: { color: minimal ? "#6b46ff" : HEALTH_HEX[h], w: sel ? 5 : 2.5, o: selectedId && !sel ? 0.25 : 0.85 },
          geometry: { type: "LineString", coordinates: coords },
        });
    }
    (map.getSource("routes") as GeoJSONSource).setData(routes);

    const prop: FC = { type: "FeatureCollection", features: [] };
    if (proposals !== "none") {
      for (const g of state.suggestions) {
        if (g.status !== "pending" || g.type !== "reroute" || !g.reroute) continue;
        if (proposals === "selected" && g.shipmentId !== selectedId) continue;
        const s = engine.ship(g.shipmentId);
        if (!s || (filter && !filter(s))) continue;
        const pos = engine.position(s);
        prop.features.push({
          type: "Feature",
          properties: {},
          geometry: { type: "LineString", coordinates: [[pos.lng, pos.lat], ...pathCoords(g.reroute.proposedPath)] },
        });
      }
    }
    (map.getSource("proposed") as GeoJSONSource).setData(prop);

    const inc: FC = { type: "FeatureCollection", features: [] };
    for (const i of minimal ? [] : state.incidents) {
      const e = EDGES.find((x) => x.id === i.edgeId)!;
      inc.features.push({ type: "Feature", properties: {}, geometry: { type: "LineString", coordinates: [[HUBS[e.a].lng, HUBS[e.a].lat], [HUBS[e.b].lng, HUBS[e.b].lat]] } });
    }
    (map.getSource("incident-edges") as GeoJSONSource).setData(inc);

    // camions
    const seen = new Set<string>();
    for (const s of visible) {
      if (s.phase === "planned") continue;
      seen.add(s.id);
      const pos = engine.position(s);
      let entry = markers.current.get(s.id);
      if (!entry) {
        const el = document.createElement("div");
        el.className = "truck-marker";
        el.innerHTML = TRUCK_SVG;
        el.addEventListener("click", (ev) => {
          ev.stopPropagation();
          selectRef.current?.(s.id);
        });
        const m = new ml.Marker({ element: el }).setLngLat([pos.lng, pos.lat]).addTo(map);
        entry = { m, el };
        markers.current.set(s.id, entry);
      }
      entry.m.setLngLat([pos.lng, pos.lat]);
      const sel = s.id === selectedId;
      entry.el.style.setProperty("--c", minimal ? "var(--accent)" : HEALTH_COLOR[engine.health(s)]);
      entry.el.classList.toggle("is-selected", sel);
      entry.el.style.zIndex = sel ? "5" : "1";
      entry.el.style.opacity = selectedId && !sel ? "0.55" : "1";
      const wantLabel = !minimal && (labels || sel);
      let label = entry.el.querySelector(".truck-label") as HTMLSpanElement | null;
      if (wantLabel) {
        if (!label) {
          label = document.createElement("span");
          label.className = "truck-label";
          entry.el.appendChild(label);
        }
        label.textContent = s.phase === "stopped" ? `${s.id} · ${t(`stop.${s.stopReason ?? "break"}`)}` : `${s.id} · ${t("common.kmh", { n: s.speedKmh })}`;
      } else label?.remove();
      entry.el.title = `${s.id} · ${s.driver.name}`;
    }
    for (const [id, { m }] of markers.current) {
      if (!seen.has(id)) {
        m.remove();
        markers.current.delete(id);
      }
    }

    // incidents
    const incSeen = new Set<string>();
    for (const i of minimal ? [] : state.incidents) {
      incSeen.add(i.id);
      if (incMarkers.current.has(i.id)) continue;
      const e = EDGES.find((x) => x.id === i.edgeId)!;
      const a = HUBS[e.a];
      const b = HUBS[e.b];
      const el = document.createElement("div");
      el.className = "incident-marker";
      el.style.setProperty("--c", i.kind === "accident" ? "#e5484d" : i.kind === "bouchon" ? "#d98b00" : "#8a8a99");
      el.textContent = "!";
      el.title = `${t(`incident.${i.kind}`)} · ${e.road}`;
      const m = new ml.Marker({ element: el }).setLngLat([a.lng + (b.lng - a.lng) * i.t, a.lat + (b.lat - a.lat) * i.t]).addTo(map);
      incMarkers.current.set(i.id, m);
    }
    for (const [id, m] of incMarkers.current) {
      if (!incSeen.has(id)) {
        m.remove();
        incMarkers.current.delete(id);
      }
    }
  }, [state, engine, selectedId, ready, filter, proposals, labels, minimal, t]);

  // recadrage sur le camion sélectionné
  useEffect(() => {
    const map = mapRef.current;
    const ml = mlRef.current;
    if (!map || !ml || !ready) return;
    const s = selectedId ? engine.ship(selectedId) : null;
    if (!s) {
      map.fitBounds(FRANCE, { padding: 20, duration: 600 });
      return;
    }
    const pos = engine.position(s);
    const pts: [number, number][] = [[pos.lng, pos.lat], ...pathCoords(s.path.slice(s.legIndex + 1))];
    const g = engine.state.suggestions.find((x) => x.shipmentId === s.id && x.status === "pending" && x.reroute);
    if (g?.reroute) pts.push(...pathCoords(g.reroute.proposedPath));
    const b = new ml.LngLatBounds(pts[0], pts[0]);
    pts.forEach((p) => b.extend(p));
    map.fitBounds(b, { padding: { top: 50, bottom: 40, left: 40, right: 40 }, maxZoom: 8.5, duration: 700 });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedId, ready]);

  return (
    <div className={`relative overflow-hidden rounded-2xl bg-[#e9edf2] ${className}`}>
      {/* style en ligne : la feuille de MapLibre force position: relative sur le conteneur */}
      <div ref={box} style={{ position: "absolute", inset: 0 }} />
      <div className="pointer-events-none absolute bottom-2 left-2 flex data-[hidden=true]:hidden flex-wrap gap-x-3 gap-y-1 rounded-full bg-white/90 px-3 py-1 text-[10px] text-muted shadow-sm" data-hidden={minimal}>
        <Legend color="var(--ok)" label={t("legend.ontime")} />
        <Legend color="var(--warn)" label={t("legend.risk")} />
        <Legend color="var(--bad)" label={t("legend.late")} />
        <Legend color="var(--accent)" label={t("legend.proposed")} dashed />
      </div>
      {offline && <span className="absolute right-12 top-2 rounded-full bg-white/90 px-2 py-0.5 text-[10px] text-faint">{t("map.fallback")}</span>}
    </div>
  );
}

function Legend({ color, label, dashed }: { color: string; label: string; dashed?: boolean }) {
  return (
    <span className="flex items-center gap-1">
      <span className="inline-block h-0.5 w-3" style={{ background: dashed ? `repeating-linear-gradient(90deg, ${color} 0 3px, transparent 3px 5px)` : color }} />
      {label}
    </span>
  );
}

function addLayers(map: MlMap) {
  const empty: FC = { type: "FeatureCollection", features: [] };
  if (!map.getSource("hubs"))
    map.addSource("hubs", {
      type: "geojson",
      data: {
        type: "FeatureCollection",
        features: Object.values(HUBS).map((h) => ({ type: "Feature", properties: { name: h.name }, geometry: { type: "Point", coordinates: [h.lng, h.lat] } })),
      },
    });
  if (!map.getSource("network"))
    map.addSource("network", {
      type: "geojson",
      data: {
        type: "FeatureCollection",
        features: EDGES.map((e) => ({ type: "Feature", properties: {}, geometry: { type: "LineString", coordinates: [[HUBS[e.a].lng, HUBS[e.a].lat], [HUBS[e.b].lng, HUBS[e.b].lat]] } })),
      },
    });
  for (const id of ["routes", "proposed", "incident-edges"]) if (!map.getSource(id)) map.addSource(id, { type: "geojson", data: empty });

  if (!map.getLayer("network")) map.addLayer({ id: "network", type: "line", source: "network", paint: { "line-color": "#b9bfca", "line-width": 1, "line-opacity": 0.6 } });
  if (!map.getLayer("incident-edges"))
    map.addLayer({ id: "incident-edges", type: "line", source: "incident-edges", paint: { "line-color": "#e5484d", "line-width": 7, "line-opacity": 0.18 } });
  if (!map.getLayer("routes"))
    map.addLayer({
      id: "routes",
      type: "line",
      source: "routes",
      layout: { "line-cap": "round", "line-join": "round" },
      paint: { "line-color": ["get", "color"], "line-width": ["get", "w"], "line-opacity": ["get", "o"] },
    });
  if (!map.getLayer("proposed"))
    map.addLayer({
      id: "proposed",
      type: "line",
      source: "proposed",
      layout: { "line-cap": "round", "line-join": "round" },
      paint: { "line-color": "#6b46ff", "line-width": 3, "line-dasharray": [1, 1.6] },
    });
  if (!map.getLayer("hubs"))
    map.addLayer({
      id: "hubs",
      type: "circle",
      source: "hubs",
      paint: { "circle-radius": 3, "circle-color": "#ffffff", "circle-stroke-color": "#8f96a3", "circle-stroke-width": 1.2 },
    });
}
