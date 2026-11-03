import type { NodeId } from "./network";

export type CargoType = "frigo" | "sec" | "pharma" | "adr";
export type ShipmentPhase = "planned" | "en_route" | "stopped" | "delivered";
export type Health = "ontime" | "risk" | "late" | "delivered" | "planned";
export type StopReason = "breakdown" | "break" | "reefer_check";
export type IncidentKind = "accident" | "travaux" | "bouchon";
export type SuggestionType = "reroute" | "notify" | "reefer";
export type SuggestionStatus = "pending" | "approved" | "rejected" | "auto" | "expired";
export type Locale = "fr" | "en" | "es" | "de";
export type IncidentLevel = "calme" | "normal" | "chaotique";

export interface Driver {
  name: string;
  phone: string;
}

export interface TempSample {
  t: number;
  v: number;
}

export interface ShipEvent {
  t: number;
  key: string;
  vars?: Record<string, string | number>;
  tone?: "info" | "good" | "warn" | "bad" | "agent";
}

export interface Shipment {
  id: string;
  client: string;
  contact: { name: string; role: string; email: string };
  origin: NodeId;
  destination: NodeId;
  cargo: CargoType;
  pallets: number;
  weightKg: number;
  setpointC?: number;
  tempC?: number;
  reeferFault: boolean;
  plate: string;
  truckModel: string;
  driver: Driver;
  departAt: number; // minutes depuis minuit (temps simulé)
  windowStart: number;
  windowEnd: number;
  path: NodeId[];
  originalPath: NodeId[];
  legIndex: number; // index du tronçon courant (path[legIndex] -> path[legIndex+1])
  legKm: number; // km parcourus sur le tronçon courant
  phase: ShipmentPhase;
  stopReason?: StopReason;
  stopUntil?: number;
  speedKmh: number;
  fuelPct: number;
  drivingLeftMin: number; // temps de conduite avant pause obligatoire (4h30)
  kmDone: number;
  deliveredAt?: number;
  rerouted: boolean;
  customerNotified: boolean;
  tempHistory: TempSample[];
  events: ShipEvent[];
}

export interface Incident {
  id: string;
  edgeId: string;
  kind: IncidentKind;
  factor: number; // vitesse résiduelle (0.3 = 30 %)
  start: number;
  end: number;
  t: number; // position le long du tronçon (0..1) pour l'affichage
}

export interface RerouteData {
  fromNode: NodeId;
  currentPath: NodeId[];
  proposedPath: NodeId[];
  currentEta: number;
  proposedEta: number;
  gainMin: number;
  extraKm: number;
  incidentId?: string;
}

export interface NotifyData {
  newEta: number;
  delayMin: number;
}

export interface ReeferData {
  tempC: number;
  setpointC: number;
}

export interface Suggestion {
  id: string;
  type: SuggestionType;
  shipmentId: string;
  createdAt: number;
  status: SuggestionStatus;
  confidence: number;
  reroute?: RerouteData;
  notify?: NotifyData;
  reefer?: ReeferData;
  resolvedAt?: number;
  resolvedBy?: string;
}

export interface LogEntry {
  id: string;
  t: number;
  key: string;
  vars?: Record<string, string | number>;
  shipmentId?: string;
  tone: "info" | "good" | "warn" | "bad" | "agent";
}

export interface Settings {
  locale: Locale;
  speed: number; // multiplicateur : 1 s réelle = speed s simulées
  incidentLevel: IncidentLevel;
  autoApprove: boolean;
  autoThreshold: number; // 0..1
  minGainMin: number;
  operatorName: string;
  seed: number;
}

export interface SimState {
  now: number;
  day: number;
  shipments: Shipment[];
  incidents: Incident[];
  suggestions: Suggestion[];
  log: LogEntry[];
  savedMinutes: number;
  version: number;
}
