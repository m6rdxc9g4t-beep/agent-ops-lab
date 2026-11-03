// Réseau routier simplifié de la France métropolitaine (fictif mais géographiquement plausible).
// Chaque nœud est une ville / plateforme logistique, chaque arête un tronçon d'autoroute ou de nationale.

export type NodeId = string;

export interface Hub {
  id: NodeId;
  name: string;
  lat: number;
  lng: number;
}

export interface Edge {
  id: string;
  a: NodeId;
  b: NodeId;
  road: string; // ex. "A6"
  kind: "autoroute" | "nationale";
  km: number;
}

export const HUBS: Record<NodeId, Hub> = Object.fromEntries(
  (
    [
      ["PAR", "Rungis", 48.758, 2.352],
      ["LIL", "Lille", 50.629, 3.057],
      ["ARR", "Arras", 50.291, 2.777],
      ["AMI", "Amiens", 49.894, 2.296],
      ["ROU", "Rouen", 49.443, 1.099],
      ["CAE", "Caen", 49.183, -0.371],
      ["REI", "Reims", 49.258, 4.032],
      ["MET", "Metz", 49.119, 6.176],
      ["NAN", "Nancy", 48.692, 6.184],
      ["STR", "Strasbourg", 48.573, 7.752],
      ["MUL", "Mulhouse", 47.75, 7.336],
      ["TRO", "Troyes", 48.297, 4.074],
      ["AUX", "Auxerre", 47.798, 3.567],
      ["DIJ", "Dijon", 47.322, 5.041],
      ["BEA", "Beaune", 47.025, 4.84],
      ["MAC", "Mâcon", 46.307, 4.828],
      ["LYO", "Lyon Corbas", 45.668, 4.902],
      ["GRE", "Grenoble", 45.188, 5.724],
      ["VAL", "Valence", 44.933, 4.892],
      ["AVI", "Avignon", 43.949, 4.806],
      ["MAR", "Marseille Vitrolles", 43.46, 5.248],
      ["NIM", "Nîmes", 43.837, 4.36],
      ["MON", "Montpellier", 43.611, 3.877],
      ["NAR", "Narbonne", 43.184, 3.004],
      ["TOU", "Toulouse", 43.605, 1.444],
      ["BOR", "Bordeaux", 44.838, -0.579],
      ["POI", "Poitiers", 46.58, 0.34],
      ["TRS", "Tours", 47.394, 0.685],
      ["ORL", "Orléans", 47.903, 1.909],
      ["LMA", "Le Mans", 48.006, 0.199],
      ["REN", "Rennes", 48.117, -1.678],
      ["NTE", "Nantes", 47.218, -1.554],
      ["NEV", "Nevers", 46.99, 3.159],
      ["MOU", "Moulins", 46.566, 3.333],
      ["ROA", "Roanne", 46.036, 4.068],
      ["CLE", "Clermont-Ferrand", 45.778, 3.087],
      ["STE", "Saint-Étienne", 45.439, 4.387],
      ["LIM", "Limoges", 45.834, 1.262],
      ["BRI", "Brive", 45.159, 1.533],
    ] as const
  ).map(([id, name, lat, lng]) => [id, { id, name, lat, lng }]),
);

const RAW_EDGES: [NodeId, NodeId, string][] = [
  ["PAR", "ARR", "A1"],
  ["ARR", "LIL", "A1"],
  ["PAR", "AMI", "A16"],
  ["AMI", "ARR", "A29"],
  ["AMI", "ROU", "A29"],
  ["PAR", "ROU", "A13"],
  ["ROU", "CAE", "A13"],
  ["CAE", "REN", "A84"],
  ["PAR", "REI", "A4"],
  ["REI", "MET", "A4"],
  ["MET", "STR", "A4"],
  ["MET", "NAN", "A31"],
  ["NAN", "STR", "N4"],
  ["NAN", "DIJ", "A31"],
  ["STR", "MUL", "A35"],
  ["MUL", "DIJ", "A36"],
  ["PAR", "TRO", "A5"],
  ["TRO", "DIJ", "A5"],
  ["TRO", "REI", "A26"],
  ["ARR", "REI", "A26"],
  ["PAR", "AUX", "A6"],
  ["AUX", "NEV", "N151"],
  ["AUX", "TRO", "N77"],
  ["AUX", "BEA", "A6"],
  ["BEA", "DIJ", "A31"],
  ["BEA", "MAC", "A6"],
  ["MAC", "LYO", "A6"],
  ["LYO", "VAL", "A7"],
  ["VAL", "AVI", "A7"],
  ["AVI", "MAR", "A7"],
  ["AVI", "NIM", "A9"],
  ["NIM", "MON", "A9"],
  ["MON", "NAR", "A9"],
  ["NAR", "TOU", "A61"],
  ["TOU", "BOR", "A62"],
  ["BOR", "POI", "A10"],
  ["POI", "TRS", "A10"],
  ["TRS", "ORL", "A10"],
  ["ORL", "PAR", "A10"],
  ["PAR", "LMA", "A11"],
  ["LMA", "REN", "A81"],
  ["LMA", "NTE", "A11"],
  ["NTE", "REN", "N137"],
  ["NTE", "BOR", "A83"],
  ["LMA", "TRS", "A28"],
  ["PAR", "NEV", "A77"],
  ["NEV", "MOU", "N7"],
  ["MOU", "ROA", "N7"],
  ["ROA", "LYO", "N7"],
  ["MOU", "CLE", "A71"],
  ["ORL", "CLE", "A71"],
  ["CLE", "LYO", "A89"],
  ["CLE", "STE", "A72"],
  ["STE", "LYO", "A47"],
  ["CLE", "LIM", "A89"],
  ["LIM", "BRI", "A20"],
  ["BRI", "TOU", "A20"],
  ["LIM", "POI", "N147"],
  ["BRI", "BOR", "A89"],
  ["LYO", "GRE", "A43"],
  ["GRE", "VAL", "A49"],
];

export function haversineKm(lat1: number, lng1: number, lat2: number, lng2: number) {
  const R = 6371;
  const toRad = (d: number) => (d * Math.PI) / 180;
  const dLat = toRad(lat2 - lat1);
  const dLng = toRad(lng2 - lng1);
  const s =
    Math.sin(dLat / 2) ** 2 + Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(s));
}

const ROAD_FACTOR = 1.18; // une route n'est jamais une ligne droite

export const EDGES: Edge[] = RAW_EDGES.map(([a, b, road]) => {
  const A = HUBS[a];
  const B = HUBS[b];
  return {
    id: `${a}-${b}`,
    a,
    b,
    road,
    kind: road.startsWith("A") ? "autoroute" : "nationale",
    km: Math.round(haversineKm(A.lat, A.lng, B.lat, B.lng) * ROAD_FACTOR),
  };
});

const EDGE_BY_PAIR = new Map<string, Edge>();
for (const e of EDGES) {
  EDGE_BY_PAIR.set(`${e.a}|${e.b}`, e);
  EDGE_BY_PAIR.set(`${e.b}|${e.a}`, e);
}

export function edgeBetween(a: NodeId, b: NodeId): Edge {
  const e = EDGE_BY_PAIR.get(`${a}|${b}`);
  if (!e) throw new Error(`Pas de tronçon entre ${a} et ${b}`);
  return e;
}

export const TRUCK_SPEED_KMH = { autoroute: 82, nationale: 66 } as const;

/** Durée (minutes) pour parcourir un tronçon, compte tenu d'un facteur de congestion (1 = fluide). */
export function edgeMinutes(e: Edge, congestion = 1) {
  return (e.km / TRUCK_SPEED_KMH[e.kind]) * 60 / congestion;
}

/** Plus court chemin en temps (Dijkstra). `congestionOf` renvoie le facteur de vitesse d'un tronçon. */
export function fastestPath(
  from: NodeId,
  to: NodeId,
  congestionOf: (edgeId: string) => number = () => 1,
  avoidEdge?: string,
): NodeId[] | null {
  const dist = new Map<NodeId, number>();
  const prev = new Map<NodeId, NodeId>();
  const todo = new Set<NodeId>(Object.keys(HUBS));
  dist.set(from, 0);
  while (todo.size) {
    let u: NodeId | null = null;
    let best = Infinity;
    for (const n of todo) {
      const d = dist.get(n) ?? Infinity;
      if (d < best) {
        best = d;
        u = n;
      }
    }
    if (u === null) break;
    todo.delete(u);
    if (u === to) break;
    for (const e of EDGES) {
      if (e.id === avoidEdge) continue;
      const v = e.a === u ? e.b : e.b === u ? e.a : null;
      if (!v || !todo.has(v)) continue;
      const alt = best + edgeMinutes(e, congestionOf(e.id));
      if (alt < (dist.get(v) ?? Infinity)) {
        dist.set(v, alt);
        prev.set(v, u);
      }
    }
  }
  if (!dist.has(to)) return null;
  const path: NodeId[] = [to];
  while (path[0] !== from) {
    const p = prev.get(path[0]);
    if (!p) return null;
    path.unshift(p);
  }
  return path;
}

export function pathKm(path: NodeId[]) {
  let km = 0;
  for (let i = 0; i < path.length - 1; i++) km += edgeBetween(path[i], path[i + 1]).km;
  return km;
}

export function pathRoads(path: NodeId[]) {
  const roads: string[] = [];
  for (let i = 0; i < path.length - 1; i++) {
    const r = edgeBetween(path[i], path[i + 1]).road;
    if (roads[roads.length - 1] !== r) roads.push(r);
  }
  return roads;
}

export function pathCoords(path: NodeId[]): [number, number][] {
  return path.map((id) => [HUBS[id].lng, HUBS[id].lat]);
}
