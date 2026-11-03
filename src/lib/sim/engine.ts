import {
  EDGES,
  HUBS,
  type NodeId,
  edgeBetween,
  edgeMinutes,
  fastestPath,
  pathKm,
  TRUCK_SPEED_KMH,
} from "./network";
import type {
  CargoType,
  Health,
  Incident,
  IncidentKind,
  LogEntry,
  Settings,
  ShipEvent,
  Shipment,
  SimState,
  Suggestion,
} from "./types";

// ───────────────────────── utilitaires ─────────────────────────

export function mulberry32(seed: number) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const MAX_DRIVE = 270; // 4 h 30 de conduite avant une pause de 45 min (règlement CE 561/2006)
const BREAK_MIN = 45;
const START_MIN = 4 * 60; // la simulation « pré-roule » depuis 04:00
const LIVE_START = 8 * 60 + 30; // l'opérateur arrive à 08:30

export const DEFAULT_SETTINGS: Settings = {
  locale: "fr",
  speed: 60,
  incidentLevel: "normal",
  autoApprove: false,
  autoThreshold: 0.92,
  minGainMin: 10,
  operatorName: "Camille",
  seed: 48291,
};

const INCIDENT_RATE: Record<Settings["incidentLevel"], number> = {
  calme: 0.5,
  normal: 1.4,
  chaotique: 3.5,
};

export function ceil15(m: number) {
  return Math.ceil(m / 15) * 15;
}

export function health(s: Shipment, now: number, eta: number): Health {
  if (s.phase === "delivered") return "delivered";
  if (s.phase === "planned" && now < s.departAt) {
    if (eta > s.windowEnd) return "late";
    return "planned";
  }
  if (eta > s.windowEnd) return "late";
  if (s.windowEnd - eta < 20) return "risk";
  return "ontime";
}

// ───────────────────────── scénario initial ─────────────────────────

interface Seed {
  id: string;
  client: string;
  contact: [string, string];
  o: NodeId;
  d: NodeId;
  cargo: CargoType;
  depart: string;
  slack: number;
  driver: string;
  setpoint?: number;
}

const SEEDS: Seed[] = [
  { id: "EXP-48291", client: "Verdane Distribution", contact: ["Élodie Marchand", "Responsable réception"], o: "PAR", d: "LYO", cargo: "frigo", depart: "06:52", slack: 0, driver: "Marc Lefèvre", setpoint: 3 },
  { id: "EXP-48302", client: "Nordis Retail", contact: ["Romain Vasseur", "Chef de quai"], o: "LIL", d: "MAR", cargo: "sec", depart: "05:10", slack: 45, driver: "Sofia Benali" },
  { id: "EXP-48315", client: "Pharmalia Sud", contact: ["Dr Hélène Brun", "Pharmacienne responsable"], o: "PAR", d: "BOR", cargo: "pharma", depart: "05:40", slack: 25, driver: "Julien Moreau", setpoint: 5 },
  { id: "EXP-48320", client: "Optima Bricolage", contact: ["Kevin Duval", "Responsable entrepôt"], o: "NTE", d: "LYO", cargo: "sec", depart: "04:30", slack: 60, driver: "Inès Garnier" },
  { id: "EXP-48327", client: "Maison Aubrac", contact: ["Pierre Coste", "Acheteur frais"], o: "STR", d: "PAR", cargo: "frigo", depart: "05:00", slack: 30, driver: "Thomas Roux", setpoint: 2 },
  { id: "EXP-48331", client: "Calanques Négoce", contact: ["Laura Santini", "Gestionnaire flux"], o: "MAR", d: "TOU", cargo: "sec", depart: "06:30", slack: 15, driver: "Karim Haddad" },
  { id: "EXP-48336", client: "Fraîcheur d'Armor", contact: ["Yann Le Goff", "Directeur logistique"], o: "PAR", d: "REN", cargo: "frigo", depart: "06:00", slack: 40, driver: "Léa Fontaine", setpoint: 4 },
  { id: "EXP-48340", client: "Alpes Matériaux", contact: ["Bruno Favre", "Chef d'agence"], o: "LYO", d: "GRE", cargo: "sec", depart: "07:45", slack: 30, driver: "Hugo Mercier" },
  { id: "EXP-48344", client: "Atelier Brume", contact: ["Sarah Lemoine", "Office manager"], o: "PAR", d: "ROU", cargo: "sec", depart: "04:15", slack: 30, driver: "Nadia Bouzid" },
  { id: "EXP-48347", client: "Moulins de Loire", contact: ["Jean Rivière", "Responsable achats"], o: "ORL", d: "PAR", cargo: "sec", depart: "05:00", slack: 20, driver: "Antoine Perrin" },
  { id: "EXP-48352", client: "Garonne Frais", contact: ["Marie Dupuy", "Cheffe de réception"], o: "BOR", d: "TOU", cargo: "frigo", depart: "07:00", slack: 20, driver: "Chloé Martin", setpoint: 3 },
  { id: "EXP-48358", client: "Rhin Logistique", contact: ["Lukas Weber", "Dispatcheur"], o: "LIL", d: "STR", cargo: "adr", depart: "06:15", slack: 35, driver: "Yanis Girard" },
  { id: "EXP-48361", client: "Santé Arverne", contact: ["Claire Roche", "Responsable qualité"], o: "CLE", d: "MAR", cargo: "pharma", depart: "07:20", slack: 25, driver: "Émilie Lambert", setpoint: 6 },
  { id: "EXP-48365", client: "Halles du Nord", contact: ["Olivier Lemaire", "Chef de rayon"], o: "PAR", d: "LIL", cargo: "frigo", depart: "09:00", slack: 30, driver: "Lucas Bernard", setpoint: 2 },
  { id: "EXP-48370", client: "Bourgogne Vins & Co", contact: ["Anne Bertin", "Logistique export"], o: "DIJ", d: "PAR", cargo: "sec", depart: "08:10", slack: 40, driver: "Samir Chevalier" },
  { id: "EXP-48374", client: "Pays d'Oc Distribution", contact: ["Vincent Roux", "Responsable plateforme"], o: "TOU", d: "MON", cargo: "sec", depart: "09:30", slack: 30, driver: "Manon Dubois" },
  { id: "EXP-48379", client: "Fromageries de l'Ouest", contact: ["Gaëlle Morin", "Qualité produits"], o: "NTE", d: "PAR", cargo: "frigo", depart: "05:30", slack: 50, driver: "Paul Renaud", setpoint: 4 },
  { id: "EXP-48383", client: "Ouest Habitat", contact: ["Thierry Gauthier", "Conducteur de travaux"], o: "REN", d: "BOR", cargo: "sec", depart: "10:15", slack: 45, driver: "Aïcha Diallo" },
];

const FIRST_NAMES = ["Louis", "Jade", "Gabriel", "Emma", "Raphaël", "Lina", "Arthur", "Rose", "Nathan", "Zoé", "Adam", "Alice", "Malo", "Inaya", "Noah", "Sacha"];
const LAST_NAMES = ["Petit", "Durand", "Leroy", "Morel", "Simon", "Laurent", "Michel", "Garcia", "David", "Bertrand", "Vincent", "Fournier", "Girard", "Bonnet", "Blanc", "Guérin"];
const CLIENTS = ["Hexa Cosmétiques", "Ligérienne Bio", "Cuisines Varenne", "Méditerranée Primeurs", "Atlas Pièces Auto", "Domaine Saint-Clair", "Bricoplus Est", "Normandie Laitière", "Papeteries Dumont", "Volta Électroménager"];
const TRUCKS = ["Renault Trucks T 480", "Volvo FH 500", "Scania R 450", "Mercedes Actros 1845", "DAF XF 480", "Iveco S-Way 490"];

function plate(r: () => number) {
  const L = "ABCDEFGHJKLMNPQRSTVWXYZ";
  const l = () => L[Math.floor(r() * L.length)];
  const n = String(Math.floor(r() * 900) + 100);
  return `${l()}${l()}-${n}-${l()}${l()}`;
}

function phone(r: () => number) {
  const p = () => String(Math.floor(r() * 90) + 10);
  return `06 ${p()} ${p()} ${p()} ${p()}`;
}

function slug(s: string) {
  return s
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
}

function hm(s: string) {
  const [h, m] = s.split(":").map(Number);
  return h * 60 + m;
}

/** Durée nominale (min) d'un trajet, pauses réglementaires comprises. */
function nominalMinutes(path: NodeId[]) {
  let drive = 0;
  for (let i = 0; i < path.length - 1; i++) drive += edgeMinutes(edgeBetween(path[i], path[i + 1]));
  return drive + Math.floor(drive / MAX_DRIVE) * BREAK_MIN;
}

// ───────────────────────── moteur ─────────────────────────

type Listener = () => void;

export class SimEngine {
  state!: SimState;
  settings: Settings;
  private rand!: () => number;
  private listeners = new Set<Listener>();
  private timer: ReturnType<typeof setInterval> | null = null;
  private uid = 0;
  private nextShipNo = 48400;
  private cooldown = new Map<string, number>();
  private lastAgentRun = 0;

  constructor(settings: Settings = DEFAULT_SETTINGS) {
    this.settings = { ...settings };
    this.reset();
  }

  // ── abonnement (useSyncExternalStore) ──
  subscribe = (fn: Listener) => {
    this.listeners.add(fn);
    return () => this.listeners.delete(fn);
  };
  getState = () => this.state;
  private emit() {
    this.state = { ...this.state, version: this.state.version + 1 };
    this.listeners.forEach((l) => l());
  }

  start() {
    if (this.timer) return;
    const TICK_MS = 250;
    this.timer = setInterval(() => {
      if (this.settings.speed <= 0) return;
      const dt = (this.settings.speed * TICK_MS) / 1000 / 60; // minutes simulées
      this.advance(dt, true);
      this.emit();
    }, TICK_MS);
  }
  stop() {
    if (this.timer) clearInterval(this.timer);
    this.timer = null;
  }

  updateSettings(patch: Partial<Settings>) {
    const reseed = patch.seed !== undefined && patch.seed !== this.settings.seed;
    this.settings = { ...this.settings, ...patch };
    if (reseed) this.reset();
    else this.emit();
  }

  private id(prefix: string) {
    this.uid += 1;
    return `${prefix}-${this.uid}`;
  }

  // ── initialisation ──
  reset() {
    this.rand = mulberry32(this.settings.seed);
    this.uid = 0;
    this.nextShipNo = 48400;
    this.cooldown.clear();
    this.lastAgentRun = 0;
    this.state = {
      now: START_MIN,
      day: 0,
      shipments: [],
      incidents: [],
      suggestions: [],
      log: [],
      savedMinutes: 0,
      version: 0,
    };
    for (const s of SEEDS) this.state.shipments.push(this.makeShipment(s));

    // pré-roulage silencieux jusqu'à l'arrivée de l'opérateur
    this.advance(LIVE_START - START_MIN, false);
    this.state.log = this.state.log.filter((l) => l.key.startsWith("log.delivered"));

    this.scriptOpening();
    this.runAgent(true);
    this.emit();
  }

  private makeShipment(seed: Seed): Shipment {
    const r = this.rand;
    const path = fastestPath(seed.o, seed.d)!;
    const departAt = hm(seed.depart);
    const eta0 = departAt + nominalMinutes(path);
    const windowEnd = ceil15(eta0 + seed.slack);
    const pallets = 8 + Math.floor(r() * 25);
    return {
      id: seed.id,
      client: seed.client,
      contact: {
        name: seed.contact[0],
        role: seed.contact[1],
        email: `${slug(seed.contact[0]).split("-")[0]}@${slug(seed.client)}.example`,
      },
      origin: seed.o,
      destination: seed.d,
      cargo: seed.cargo,
      pallets,
      weightKg: Math.round((pallets * (420 + r() * 380)) / 10) * 10,
      setpointC: seed.setpoint,
      tempC: seed.setpoint !== undefined ? seed.setpoint + (r() - 0.5) * 0.6 : undefined,
      reeferFault: false,
      plate: plate(r),
      truckModel: TRUCKS[Math.floor(r() * TRUCKS.length)],
      driver: { name: seed.driver, phone: phone(r) },
      departAt,
      windowStart: windowEnd - 60,
      windowEnd,
      path,
      originalPath: path,
      legIndex: 0,
      legKm: 0,
      phase: "planned",
      speedKmh: 0,
      fuelPct: 72 + Math.floor(r() * 26),
      drivingLeftMin: MAX_DRIVE,
      kmDone: 0,
      rerouted: false,
      customerNotified: false,
      tempHistory: [],
      events: [{ t: departAt - 90, key: "ev.created", tone: "info" }],
    };
  }

  /** Scénario d'ouverture inspiré du reel : un accident sur l'A6 qui menace un camion frigorifique. */
  private scriptOpening() {
    const now = this.state.now;
    const hero = this.ship("EXP-48291")!;
    const acc: Incident = {
      id: this.id("INC"),
      edgeId: edgeBetween("AUX", "BEA").id,
      kind: "accident",
      factor: 0.42,
      start: now - 6,
      end: now + 210,
      t: 0.35,
    };
    this.state.incidents.push(acc);
    this.log("log.incident", { road: "A6", from: "Auxerre", to: "Beaune", kind: "accident" }, "bad");

    // fenêtre de livraison calée pour que le détour sauve la livraison
    const cong = this.congestion();
    const next = hero.path[hero.legIndex + 1];
    const alt = fastestPath(next, hero.destination, cong);
    if (alt) {
      const altEta = this.etaFor(hero, alt);
      hero.windowEnd = ceil15(altEta + 6);
      hero.windowStart = hero.windowEnd - 60;
    }

    // dérive de température sur un frigo
    const cold = this.ship("EXP-48379")!;
    cold.reeferFault = true;
    cold.tempC = (cold.setpointC ?? 4) + 1.9;
    cold.events.push({ t: now - 12, key: "ev.reeferDrift", tone: "warn" });

    // bouchon sur l'A7
    this.state.incidents.push({
      id: this.id("INC"),
      edgeId: edgeBetween("LYO", "VAL").id,
      kind: "bouchon",
      factor: 0.55,
      start: now - 20,
      end: now + 80,
      t: 0.6,
    });
    this.log("log.incident", { road: "A7", from: "Lyon Corbas", to: "Valence", kind: "bouchon" }, "warn");
  }

  ship(id: string) {
    return this.state.shipments.find((s) => s.id === id);
  }

  private log(key: string, vars: LogEntry["vars"], tone: LogEntry["tone"], shipmentId?: string) {
    this.state.log.unshift({ id: this.id("LOG"), t: this.state.now, key, vars, tone, shipmentId });
    if (this.state.log.length > 300) this.state.log.length = 300;
  }

  private event(s: Shipment, key: string, vars?: ShipEvent["vars"], tone: ShipEvent["tone"] = "info") {
    s.events.push({ t: this.state.now, key, vars, tone });
    if (s.events.length > 60) s.events.shift();
  }

  // ── trafic ──
  congestion(): (edgeId: string) => number {
    const m = new Map<string, number>();
    for (const i of this.state.incidents) m.set(i.edgeId, Math.min(m.get(i.edgeId) ?? 1, i.factor));
    return (id) => m.get(id) ?? 1;
  }

  /** Minutes de conduite restantes sur `path` à partir du nœud suivant + reste du tronçon courant. */
  private driveMinutes(s: Shipment, tail: NodeId[], cong = this.congestion()) {
    let m = 0;
    if (s.phase !== "planned" && s.legIndex < s.path.length - 1) {
      const e = edgeBetween(s.path[s.legIndex], s.path[s.legIndex + 1]);
      m += ((e.km - s.legKm) / TRUCK_SPEED_KMH[e.kind]) * 60 / cong(e.id);
    }
    for (let i = 0; i < tail.length - 1; i++) {
      const e = edgeBetween(tail[i], tail[i + 1]);
      m += edgeMinutes(e, cong(e.id));
    }
    return m;
  }

  /** ETA (minutes simulées) si le camion suit `tail` à partir du prochain nœud. */
  etaFor(s: Shipment, tail?: NodeId[]) {
    const now = this.state.now;
    if (s.phase === "delivered") return s.deliveredAt ?? now;
    if (s.phase === "planned") {
      return Math.max(now, s.departAt) + nominalMinutes(s.path);
    }
    const t = tail ?? s.path.slice(s.legIndex + 1);
    const drive = this.driveMinutes(s, t);
    const stop = s.phase === "stopped" && s.stopUntil ? Math.max(0, s.stopUntil - now) : 0;
    const left = s.stopReason === "break" && s.phase === "stopped" ? MAX_DRIVE : s.drivingLeftMin;
    const breaks = drive > left ? Math.ceil((drive - left) / MAX_DRIVE) * BREAK_MIN : 0;
    return now + stop + drive + breaks;
  }

  eta(s: Shipment) {
    return this.etaFor(s);
  }

  health(s: Shipment) {
    return health(s, this.state.now, this.eta(s));
  }

  /** Position [lng, lat] et cap du camion. */
  position(s: Shipment): { lng: number; lat: number; heading: number } {
    if (s.phase === "delivered") {
      const h = HUBS[s.destination];
      return { lng: h.lng, lat: h.lat, heading: 0 };
    }
    const a = HUBS[s.path[s.legIndex]];
    const b = HUBS[s.path[Math.min(s.legIndex + 1, s.path.length - 1)]];
    const e = s.legIndex < s.path.length - 1 ? edgeBetween(a.id, b.id) : null;
    const f = e ? Math.min(1, s.legKm / e.km) : 0;
    const heading = (Math.atan2(b.lng - a.lng, b.lat - a.lat) * 180) / Math.PI;
    return { lng: a.lng + (b.lng - a.lng) * f, lat: a.lat + (b.lat - a.lat) * f, heading };
  }

  // ── boucle de simulation ──
  advance(minutes: number, live: boolean) {
    let left = minutes;
    while (left > 1e-6) {
      const step = Math.min(1, left);
      this.step(step, live);
      left -= step;
    }
  }

  private step(dt: number, live: boolean) {
    const st = this.state;
    st.now += dt;
    st.day = Math.floor(st.now / 1440);
    const r = this.rand;

    // incidents terminés
    const ended = st.incidents.filter((i) => i.end <= st.now);
    if (ended.length) {
      st.incidents = st.incidents.filter((i) => i.end > st.now);
      if (live)
        for (const i of ended) {
          const e = EDGES.find((x) => x.id === i.edgeId)!;
          this.log("log.incidentCleared", { road: e.road, from: HUBS[e.a].name, to: HUBS[e.b].name }, "good");
        }
    }

    // nouveaux incidents
    if (live && st.incidents.length < 7 && r() < (INCIDENT_RATE[this.settings.incidentLevel] / 60) * dt) {
      this.spawnIncident();
    }
    // pannes de groupe froid et mécaniques (rares)
    if (live && r() < (0.25 / 60) * dt * (this.settings.incidentLevel === "chaotique" ? 2.5 : 1)) {
      const cands = st.shipments.filter((s) => s.phase === "en_route" && s.setpointC !== undefined && !s.reeferFault);
      const s = cands[Math.floor(r() * cands.length)];
      if (s) {
        s.reeferFault = true;
        this.event(s, "ev.reeferDrift", undefined, "warn");
        this.log("log.reeferDrift", { id: s.id }, "warn", s.id);
      }
    }
    if (live && r() < (0.12 / 60) * dt * (this.settings.incidentLevel === "chaotique" ? 3 : 1)) {
      const cands = st.shipments.filter((s) => s.phase === "en_route");
      const s = cands[Math.floor(r() * cands.length)];
      if (s) {
        s.phase = "stopped";
        s.stopReason = "breakdown";
        s.stopUntil = st.now + 35 + Math.floor(r() * 55);
        s.speedKmh = 0;
        this.event(s, "ev.breakdown", undefined, "bad");
        this.log("log.breakdown", { id: s.id, driver: s.driver.name }, "bad", s.id);
      }
    }

    const cong = this.congestion();
    for (const s of st.shipments) this.moveShipment(s, dt, cong, live);

    // flux continu de nouvelles expéditions
    if (live) {
      const active = st.shipments.filter((s) => s.phase !== "delivered").length;
      if (active < 12 && r() < 0.08 * dt) this.spawnShipment();
      // on oublie les livraisons anciennes pour garder la liste lisible
      if (st.shipments.length > 30) {
        const idx = st.shipments.findIndex((s) => s.phase === "delivered" && st.now - (s.deliveredAt ?? 0) > 240);
        if (idx >= 0) st.shipments.splice(idx, 1);
      }
    }

    if (live && st.now - this.lastAgentRun >= 3) {
      this.lastAgentRun = st.now;
      this.runAgent(false);
    }
  }

  private moveShipment(s: Shipment, dt: number, cong: (id: string) => number, live: boolean) {
    const st = this.state;
    const r = this.rand;

    // température
    if (s.setpointC !== undefined && s.tempC !== undefined && s.phase !== "delivered") {
      if (s.reeferFault) s.tempC = Math.min(s.setpointC + 9, s.tempC + 0.045 * dt + (r() - 0.5) * 0.02);
      else s.tempC += (s.setpointC - s.tempC) * 0.06 * dt + (r() - 0.5) * 0.04 * dt;
      const last = s.tempHistory[s.tempHistory.length - 1];
      if (!last || st.now - last.t >= 10) {
        s.tempHistory.push({ t: st.now, v: Math.round(s.tempC * 10) / 10 });
        if (s.tempHistory.length > 90) s.tempHistory.shift();
      }
    }

    if (s.phase === "delivered") return;
    if (s.phase === "planned") {
      if (st.now >= s.departAt) {
        s.phase = "en_route";
        this.event(s, "ev.departed", { hub: HUBS[s.origin].name }, "info");
        if (live) this.log("log.departed", { id: s.id, hub: HUBS[s.origin].name }, "info", s.id);
      } else return;
    }
    if (s.phase === "stopped") {
      if (s.stopUntil !== undefined && st.now >= s.stopUntil) {
        if (s.stopReason === "break") s.drivingLeftMin = MAX_DRIVE;
        if (s.stopReason === "reefer_check") {
          s.reeferFault = false;
          this.event(s, "ev.reeferFixed", undefined, "good");
        }
        if (s.stopReason === "breakdown") this.event(s, "ev.repaired", undefined, "good");
        s.phase = "en_route";
        s.stopReason = undefined;
        s.stopUntil = undefined;
      } else {
        s.speedKmh = 0;
        return;
      }
    }

    // en route
    const e = edgeBetween(s.path[s.legIndex], s.path[s.legIndex + 1]);
    const f = cong(e.id);
    s.speedKmh = Math.round(TRUCK_SPEED_KMH[e.kind] * f * (0.93 + r() * 0.1));
    const km = (s.speedKmh * dt) / 60;
    s.legKm += km;
    s.kmDone += km;
    s.fuelPct = Math.max(4, s.fuelPct - km * 0.055);
    s.drivingLeftMin -= dt;

    if (s.legKm >= e.km) {
      s.legKm = 0;
      s.legIndex += 1;
      if (s.legIndex >= s.path.length - 1) {
        s.phase = "delivered";
        s.deliveredAt = st.now;
        s.speedKmh = 0;
        const onTime = st.now <= s.windowEnd;
        this.event(s, onTime ? "ev.deliveredOnTime" : "ev.deliveredLate", { hub: HUBS[s.destination].name }, onTime ? "good" : "bad");
        this.log(onTime ? "log.deliveredOnTime" : "log.deliveredLate", { id: s.id, hub: HUBS[s.destination].name }, onTime ? "good" : "bad", s.id);
        // on clôt les suggestions en cours
        for (const g of st.suggestions) if (g.shipmentId === s.id && g.status === "pending") g.status = "expired";
        return;
      }
      this.event(s, "ev.passed", { hub: HUBS[s.path[s.legIndex]].name }, "info");
    }

    if (s.drivingLeftMin <= 0) {
      s.phase = "stopped";
      s.stopReason = "break";
      s.stopUntil = st.now + BREAK_MIN;
      s.speedKmh = 0;
      this.event(s, "ev.break", undefined, "info");
    }
  }

  private spawnIncident() {
    const st = this.state;
    const r = this.rand;
    let edgeId: string;
    const moving = st.shipments.filter((s) => s.phase === "en_route" && s.legIndex < s.path.length - 2);
    if (moving.length && r() < 0.75) {
      const s = moving[Math.floor(r() * moving.length)];
      const i = s.legIndex + 1 + Math.floor(r() * (s.path.length - 2 - s.legIndex));
      edgeId = edgeBetween(s.path[i], s.path[i + 1]).id;
    } else {
      edgeId = EDGES[Math.floor(r() * EDGES.length)].id;
    }
    if (st.incidents.some((i) => i.edgeId === edgeId)) return;
    const kinds: IncidentKind[] = ["accident", "bouchon", "travaux"];
    const kind = kinds[Math.floor(r() * 3)];
    const factor = kind === "accident" ? 0.28 + r() * 0.15 : kind === "bouchon" ? 0.45 + r() * 0.15 : 0.58 + r() * 0.12;
    const inc: Incident = {
      id: this.id("INC"),
      edgeId,
      kind,
      factor: Math.round(factor * 100) / 100,
      start: st.now,
      end: st.now + 40 + Math.floor(r() * 120),
      t: 0.2 + r() * 0.6,
    };
    st.incidents.push(inc);
    const e = EDGES.find((x) => x.id === edgeId)!;
    this.log("log.incident", { road: e.road, from: HUBS[e.a].name, to: HUBS[e.b].name, kind }, kind === "accident" ? "bad" : "warn");
  }

  /** Ajoute une expédition aléatoire (bouton « Nouvelle expédition »). */
  addShipment() {
    this.spawnShipment();
    this.emit();
    return this.state.shipments[this.state.shipments.length - 1];
  }

  private spawnShipment() {
    const r = this.rand;
    const ids = Object.keys(HUBS);
    const o = ids[Math.floor(r() * ids.length)];
    let d = o;
    while (d === o || pathKm(fastestPath(o, d)!) > 750 || pathKm(fastestPath(o, d)!) < 90) d = ids[Math.floor(r() * ids.length)];
    const cargo: CargoType = (["sec", "sec", "frigo", "frigo", "pharma", "adr"] as const)[Math.floor(r() * 6)];
    const now = this.state.now;
    const dep = Math.round(now + 15 + r() * 45);
    const pad = (n: number) => String(n).padStart(2, "0");
    const client = CLIENTS[Math.floor(r() * CLIENTS.length)];
    const contact = `${FIRST_NAMES[Math.floor(r() * FIRST_NAMES.length)]} ${LAST_NAMES[Math.floor(r() * LAST_NAMES.length)]}`;
    const driver = `${FIRST_NAMES[Math.floor(r() * FIRST_NAMES.length)]} ${LAST_NAMES[Math.floor(r() * LAST_NAMES.length)]}`;
    this.nextShipNo += 3 + Math.floor(r() * 6);
    const s = this.makeShipment({
      id: `EXP-${this.nextShipNo}`,
      client,
      contact: [contact, "Réception"],
      o,
      d,
      cargo,
      depart: `${pad(Math.floor((dep % 1440) / 60))}:${pad(dep % 60)}`,
      slack: [10, 20, 30, 45, 60][Math.floor(r() * 5)],
      driver,
      setpoint: cargo === "frigo" ? 2 + Math.floor(r() * 3) : cargo === "pharma" ? 5 : undefined,
    });
    // makeShipment lit l'heure sur 24 h ; on recale sur le jour courant
    const shift = dep - s.departAt;
    s.departAt += shift;
    s.windowStart += shift;
    s.windowEnd += shift;
    s.events[0].t = now;
    this.state.shipments.push(s);
    this.log("log.newShipment", { id: s.id, from: HUBS[o].name, to: HUBS[d].name }, "info", s.id);
  }

  // ── l'agent ──
  private runAgent(initial: boolean) {
    const st = this.state;
    const cong = this.congestion();
    const now = st.now;

    // expiration des suggestions devenues caduques
    for (const g of st.suggestions) {
      if (g.status !== "pending") continue;
      const s = this.ship(g.shipmentId);
      if (!s || s.phase === "delivered") {
        g.status = "expired";
        continue;
      }
      if (g.type === "reroute" && g.reroute) {
        const next = s.path[s.legIndex + 1];
        if (next !== g.reroute.fromNode) {
          g.status = "expired";
          g.resolvedAt = now;
          this.log("log.expired", { id: s.id }, "info", s.id);
          continue;
        }
        // on rafraîchit les chiffres
        const cur = this.etaFor(s);
        const prop = this.etaFor(s, g.reroute.proposedPath);
        g.reroute.currentEta = cur;
        g.reroute.proposedEta = prop;
        g.reroute.gainMin = Math.round(cur - prop);
        if (g.reroute.gainMin < this.settings.minGainMin / 2) {
          g.status = "expired";
          g.resolvedAt = now;
        }
      }
      if (g.type === "reefer" && s.tempC !== undefined && g.reefer) g.reefer.tempC = s.tempC;
      if (g.type === "notify" && g.notify) {
        const eta = this.eta(s);
        g.notify.newEta = eta;
        g.notify.delayMin = Math.round(eta - s.windowEnd);
        if (eta <= s.windowEnd) g.status = "expired";
      }
    }

    const pending = (id: string, type: Suggestion["type"]) =>
      st.suggestions.some((g) => g.shipmentId === id && g.type === type && g.status === "pending");
    const cooling = (id: string, type: string) => (this.cooldown.get(`${id}|${type}`) ?? -1) > now;

    for (const s of st.shipments) {
      if (s.phase === "delivered" || s.phase === "planned") continue;

      // 1) itinéraire bis
      if (!pending(s.id, "reroute") && !cooling(s.id, "reroute") && s.legIndex < s.path.length - 1) {
        const next = s.path[s.legIndex + 1];
        if (next !== s.destination) {
          const tail = s.path.slice(s.legIndex + 1);
          const alt = fastestPath(next, s.destination, cong);
          if (alt && alt.join() !== tail.join() && alt[1] !== s.path[s.legIndex]) {
            const cur = this.etaFor(s, tail);
            const prop = this.etaFor(s, alt);
            const gain = Math.round(cur - prop);
            if (gain >= this.settings.minGainMin) {
              const blocking = st.incidents.find((i) => tail.some((n, k) => k < tail.length - 1 && edgeBetween(n, tail[k + 1]).id === i.edgeId))
                ?? st.incidents.find((i) => i.edgeId === edgeBetween(s.path[s.legIndex], next).id);
              const conf = Math.min(0.97, 0.74 + Math.min(0.15, gain / 420) + (blocking?.kind === "accident" ? 0.04 : 0) + this.rand() * 0.04);
              this.suggest({
                type: "reroute",
                shipmentId: s.id,
                confidence: Math.round(conf * 100) / 100,
                reroute: {
                  fromNode: next,
                  currentPath: tail,
                  proposedPath: alt,
                  currentEta: cur,
                  proposedEta: prop,
                  gainMin: gain,
                  extraKm: Math.round(pathKm(alt) - pathKm(tail)),
                  incidentId: blocking?.id,
                },
              }, initial);
            }
          }
        }
      }

      // 2) chaîne du froid
      if (s.setpointC !== undefined && s.tempC !== undefined && s.reeferFault && s.tempC - s.setpointC > 1.4 && !pending(s.id, "reefer") && !cooling(s.id, "reefer") && s.stopReason !== "reefer_check") {
        this.suggest({ type: "reefer", shipmentId: s.id, confidence: 0.88, reefer: { tempC: s.tempC, setpointC: s.setpointC } }, initial);
      }

      // 3) prévenir le client si le retard est inévitable
      const eta = this.eta(s);
      if (eta > s.windowEnd + 5 && !s.customerNotified && !pending(s.id, "reroute") && !pending(s.id, "notify") && !cooling(s.id, "notify")) {
        this.suggest({ type: "notify", shipmentId: s.id, confidence: 0.9, notify: { newEta: eta, delayMin: Math.round(eta - s.windowEnd) } }, initial);
      }
    }
  }

  private suggest(g: Omit<Suggestion, "id" | "createdAt" | "status">, quiet: boolean) {
    const sug: Suggestion = { ...g, id: this.id("SUG"), createdAt: this.state.now, status: "pending" };
    this.state.suggestions.unshift(sug);
    if (this.state.suggestions.length > 200) this.state.suggestions.length = 200;
    const s = this.ship(g.shipmentId)!;
    this.event(s, `ev.sug.${g.type}`, g.reroute ? { gain: g.reroute.gainMin } : undefined, "agent");
    this.log(`log.sug.${g.type}`, { id: s.id, gain: g.reroute?.gainMin ?? 0 }, "agent", s.id);
    if (!quiet && this.settings.autoApprove && sug.confidence >= this.settings.autoThreshold) {
      this.resolve(sug.id, true, "agent");
    }
  }

  // ── actions de l'opérateur ──
  approve(id: string) {
    this.resolve(id, true, this.settings.operatorName);
    this.emit();
  }
  reject(id: string) {
    this.resolve(id, false, this.settings.operatorName);
    this.emit();
  }

  private resolve(id: string, ok: boolean, by: string) {
    const st = this.state;
    const g = st.suggestions.find((x) => x.id === id);
    if (!g || g.status !== "pending") return;
    const s = this.ship(g.shipmentId);
    if (!s) return;
    g.resolvedAt = st.now;
    g.resolvedBy = by;
    const auto = by === "agent";
    if (!ok) {
      g.status = "rejected";
      this.cooldown.set(`${s.id}|${g.type}`, st.now + 60);
      this.event(s, "ev.rejected", { by }, "info");
      this.log("log.rejected", { id: s.id, by, type: g.type }, "info", s.id);
      return;
    }
    g.status = auto ? "auto" : "approved";
    if (g.type === "reroute" && g.reroute) {
      const next = s.path[s.legIndex + 1];
      if (next !== g.reroute.fromNode) {
        g.status = "expired";
        return;
      }
      const before = this.eta(s);
      s.path = [...s.path.slice(0, s.legIndex + 1), ...g.reroute.proposedPath];
      s.rerouted = true;
      const gain = Math.max(0, Math.round(before - this.eta(s)));
      st.savedMinutes += gain;
      this.event(s, "ev.rerouted", { by, gain }, "good");
      this.log(auto ? "log.autoRerouted" : "log.rerouted", { id: s.id, by, gain }, "good", s.id);
    }
    if (g.type === "notify") {
      s.customerNotified = true;
      this.event(s, "ev.notified", { client: s.client, by }, "good");
      this.log("log.notified", { id: s.id, client: s.client, by }, "good", s.id);
    }
    if (g.type === "reefer") {
      s.phase = "stopped";
      s.stopReason = "reefer_check";
      s.stopUntil = st.now + 20;
      s.speedKmh = 0;
      this.event(s, "ev.reeferCheck", { by }, "good");
      this.log("log.reeferCheck", { id: s.id, by }, "good", s.id);
    }
  }

  /** Lien de suivi partagé (simulé). */
  shareTracking(id: string, to: string) {
    const s = this.ship(id);
    if (!s) return;
    this.event(s, "ev.shared", { to }, "info");
    this.log("log.shared", { id, to }, "info", id);
    this.emit();
  }
}
