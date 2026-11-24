import type { BoxKind, Vec } from "./types";

export interface WorldPoint {
  x: number;
  z: number;
}

export interface PulleyDef {
  id: string;
  platformId: string;
  /** Horizontal world coordinate, in the same unit as grid x. */
  x: number;
  /** Vertical offset from the platform's floor plane. */
  zOffset?: number;
}

export interface RopeDef {
  id: string;
  label: string;
  /** Total rope length, including wrap allowance. */
  length: number;
  anchors: [WorldPoint, WorldPoint];
  /** Ordered pulleys visited between anchor 0 and anchor 1. */
  pulleyIds: string[];
  wrapAllowance?: number;
  color?: string;
}

export interface PlatformCell extends Vec {
  id: string;
  label: string;
}

export interface HoistPlatform {
  id: string;
  label: string;
  cells: PlatformCell[];
  floor: number;
  initialFloor: number;
  minFloor: number;
  maxFloor: number;
  /** Integer floors at which the pin/lock can engage. */
  stops: number[];
  /** Platform self-weight. */
  mass: number;
}

export interface DispatchOrder {
  id: string;
  code: string;
  title: string;
  /** Vertical floor identity. Equal x/y but different floor never signs. */
  floor: number;
  cells: Vec[];
  exactWeight: number;
  tolerance?: number;
}

export interface FloorCandidate {
  id: string;
  floors: Record<string, number>;
  energy: number;
  movement: number;
  pathLength: Record<string, number>;
  slack: Record<string, number>;
  changedPlatformIds: string[];
}

export type SettlementStatus = "unique" | "tie" | "none";

export interface SettlementReport {
  seq: number;
  status: SettlementStatus;
  triggerPlatformId: string;
  triggerBoxId?: string;
  before: Record<string, number>;
  beforeSlack: Record<string, number>;
  candidates: FloorCandidate[];
  bestId?: string;
  tieIds: string[];
  chosenId?: string;
  newlySlackRopeIds: string[];
}

export interface OrderReading {
  orderId: string;
  weight: number;
  boxIds: string[];
  alignedWrongFloorBoxIds: string[];
  signed: boolean;
  message: string;
}

export type HoistPhase = "idle" | "settling" | "choosing" | "locked";

export interface HoistRigState {
  floorHeight: number;
  platforms: HoistPlatform[];
  pulleys: PulleyDef[];
  ropes: RopeDef[];
  orders: DispatchOrder[];
  phase: HoistPhase;
  busy: boolean;
  seq: number;
  selectedCandidateId?: string | null;
  lockCandidateId?: string;
  pending?: SettlementReport;
  last?: SettlementReport;
  readings: OrderReading[];
}

export const DEFAULT_BOX_WEIGHT: Record<BoxKind, number> = {
  timber: 4,
  glass: 7,
  iron: 12,
};

export function boxWeight(box: { kind: BoxKind; weight?: number }): number {
  return box.weight ?? DEFAULT_BOX_WEIGHT[box.kind];
}

export function boxFloor(box: { floor?: number }): number {
  return box.floor ?? 0;
}

export function samePlanCell(a: Vec, b: Vec): boolean {
  return a.x === b.x && a.y === b.y;
}
