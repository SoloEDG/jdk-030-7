import {
  boxWeight,
  samePlanCell,
  type FloorCandidate,
  type HoistRigState,
  type PlatformCell,
  type HoistPlatform,
  type RopeDef,
  type SettlementReport,
  type WorldPoint,
} from "@/shared/hoist";
import type { Box, GameDocument, Vec } from "@/shared/types";

const EPS = 1e-6;

export function platformAtCell(
  rig: HoistRigState | undefined,
  at: Vec,
): HoistPlatform | undefined {
  return rig?.platforms.find((platform) =>
    platform.cells.some((cell) => samePlanCell(cell, at)),
  );
}

export function platformCellAt(
  rig: HoistRigState | undefined,
  at: Vec,
): PlatformCell | undefined {
  return rig?.platforms
    .flatMap((platform) => platform.cells)
    .find((cell) => samePlanCell(cell, at));
}

export function boxesOnPlatform(document: GameDocument, platform: HoistPlatform): Box[] {
  return document.level.boxes.filter((box) =>
    platform.cells.some((cell) => samePlanCell(cell, box)),
  );
}

export function platformLoad(document: GameDocument, platform: HoistPlatform): number {
  const cargo = boxesOnPlatform(document, platform).reduce(
    (sum, box) => sum + boxWeight(box),
    0,
  );
  return platform.mass + cargo;
}

export function supportRopeIds(rig: HoistRigState, platformId: string): string[] {
  const pulleyIds = new Set(
    rig.pulleys.filter((pulley) => pulley.platformId === platformId).map((p) => p.id),
  );
  return rig.ropes
    .filter((rope) => rope.pulleyIds.some((id) => pulleyIds.has(id)))
    .map((rope) => rope.id);
}

export function pulleyPosition(
  rig: HoistRigState,
  pulleyId: string,
  floors: Record<string, number>,
): WorldPoint {
  const pulley = rig.pulleys.find((item) => item.id === pulleyId);
  if (!pulley) throw new Error(`缺少动滑轮 ${pulleyId}`);
  const floor = floors[pulley.platformId];
  if (floor == null) throw new Error(`吊盘 ${pulley.platformId} 缺少层位`);
  return {
    x: pulley.x,
    z: floor * rig.floorHeight + (pulley.zOffset ?? 0.2),
  };
}

export function ropePathPoints(
  rig: HoistRigState,
  rope: RopeDef,
  floors: Record<string, number>,
): WorldPoint[] {
  return [
    rope.anchors[0],
    ...rope.pulleyIds.map((id) => pulleyPosition(rig, id, floors)),
    rope.anchors[1],
  ];
}

export function ropePathLength(
  rig: HoistRigState,
  rope: RopeDef,
  floors: Record<string, number>,
): number {
  const points = ropePathPoints(rig, rope, floors);
  let length = rope.wrapAllowance ?? 0;
  for (let i = 1; i < points.length; i += 1) {
    length += Math.hypot(points[i].x - points[i - 1].x, points[i].z - points[i - 1].z);
  }
  return length;
}

export function ropeSlack(
  rig: HoistRigState,
  rope: RopeDef,
  floors: Record<string, number>,
): number {
  return rope.length - ropePathLength(rig, rope, floors);
}

function cartesianStops(platforms: HoistPlatform[]): Record<string, number>[] {
  let combos: Record<string, number>[] = [{}];
  for (const platform of platforms) {
    const stops = [...new Set(platform.stops)]
      .filter((floor) => floor >= platform.minFloor && floor <= platform.maxFloor)
      .sort((a, b) => a - b);
    if (stops.length === 0) {
      throw new Error(`吊盘 ${platform.id} 没有合法整层停靠点`);
    }
    const next: Record<string, number>[] = [];
    for (const combo of combos) {
      for (const floor of stops) next.push({ ...combo, [platform.id]: floor });
    }
    combos = next;
  }
  return combos;
}

function candidateId(floors: Record<string, number>, platforms: HoistPlatform[]): string {
  return `g-${platforms.map((p) => floors[p.id]).join("-")}`;
}

/**
 * Enumerate exact integer-stop groups. Limit overflow is deliberately not
 * distributed: a platform simply has no stop beyond its own min/max.
 */
export function enumerateCandidates(
  rig: HoistRigState,
  loads: Record<string, number>,
  before: Record<string, number>,
): FloorCandidate[] {
  const result: FloorCandidate[] = [];
  for (const floors of cartesianStops(rig.platforms)) {
    const pathLength: Record<string, number> = {};
    const slack: Record<string, number> = {};
    let feasible = true;
    for (const rope of rig.ropes) {
      pathLength[rope.id] = ropePathLength(rig, rope, floors);
      slack[rope.id] = rope.length - pathLength[rope.id];
      if (slack[rope.id] < -EPS) feasible = false;
    }
    if (!feasible) continue;

    const energy = rig.platforms.reduce(
      (sum, platform) => sum + (loads[platform.id] ?? platform.mass) * floors[platform.id],
      0,
    );
    const movement = rig.platforms.reduce(
      (sum, platform) => sum + Math.abs(floors[platform.id] - before[platform.id]),
      0,
    );
    result.push({
      id: candidateId(floors, rig.platforms),
      floors,
      energy: round6(energy),
      movement,
      pathLength: Object.fromEntries(
        Object.entries(pathLength).map(([id, value]) => [id, round6(value)]),
      ),
      slack: Object.fromEntries(
        Object.entries(slack).map(([id, value]) => [id, Math.max(0, round6(value))]),
      ),
      changedPlatformIds: rig.platforms
        .filter((platform) => floors[platform.id] !== before[platform.id])
        .map((platform) => platform.id),
    });
  }
  result.sort((a, b) => {
    if (a.energy !== b.energy) return a.energy - b.energy;
    if (a.movement !== b.movement) return a.movement - b.movement;
    return a.id.localeCompare(b.id);
  });
  return result;
}

function round6(value: number): number {
  return Math.round((value + Number.EPSILON) * 1e6) / 1e6;
}

export function currentFloors(rig: HoistRigState): Record<string, number> {
  return Object.fromEntries(rig.platforms.map((p) => [p.id, p.floor]));
}

export function computeReport(
  document: GameDocument,
  triggerPlatformId: string,
  seq: number,
  triggerBoxId?: string,
): SettlementReport {
  const rig = document.level.hoist;
  if (!rig) throw new Error("当前关卡没有吊盘索具");
  const before = currentFloors(rig);
  const loads = Object.fromEntries(
    rig.platforms.map((platform) => [platform.id, platformLoad(document, platform)]),
  );
  const candidates = enumerateCandidates(rig, loads, before);
  const beforeSlack = Object.fromEntries(
    rig.ropes.map((rope) => [rope.id, round6(Math.max(0, ropeSlack(rig, rope, before)))]),
  );
  const best = candidates[0];
  const tied = best
    ? candidates.filter(
        (candidate) =>
          candidate.energy === best.energy && candidate.movement === best.movement,
      )
    : [];
  const report: SettlementReport = {
    seq,
    status: best ? (tied.length > 1 ? "tie" : "unique") : "none",
    triggerPlatformId,
    triggerBoxId,
    before,
    beforeSlack,
    candidates,
    bestId: best?.id,
    tieIds: tied.map((candidate) => candidate.id),
    newlySlackRopeIds: best ? newlySlackFor(rig, before, best.slack) : [],
  };
  return report;
}

export function newlySlackFor(
  rig: HoistRigState,
  before: Record<string, number>,
  afterSlack: Record<string, number>,
): string[] {
  return rig.ropes
    .filter((rope) => {
      const beforeTaut = ropeSlack(rig, rope, before) <= 0.02;
      const afterLoose = (afterSlack[rope.id] ?? 0) > 0.05;
      return beforeTaut && afterLoose;
    })
    .map((rope) => rope.id);
}

export function findCandidate(
  report: SettlementReport | undefined,
  candidateId: string | null | undefined,
): FloorCandidate | undefined {
  if (!report || !candidateId) return undefined;
  return report.candidates.find((candidate) => candidate.id === candidateId);
}

export function commitCandidate(document: GameDocument, candidateId: string): SettlementReport | null {
  const rig = document.level.hoist;
  if (!rig) return null;
  const source = rig.pending ?? rig.last;
  if (!source) return null;
  const candidate = findCandidate(source, candidateId);
  if (!candidate) return null;

  for (const platform of rig.platforms) {
    platform.floor = candidate.floors[platform.id] ?? platform.floor;
  }
  for (const box of document.level.boxes) {
    const platform = platformAtCell(rig, box);
    if (platform) {
      box.platformId = platform.id;
      box.floor = platform.floor;
    } else if (box.platformId) {
      box.platformId = null;
    }
  }

  const report: SettlementReport = {
    ...(source as SettlementReport),
    chosenId: candidate.id,
    newlySlackRopeIds: newlySlackFor(rig, source.before, candidate.slack),
  };
  rig.last = report;
  rig.pending = undefined;
  rig.selectedCandidateId = candidate.id;
  rig.lockCandidateId = candidate.id;
  rig.phase = "locked";
  rig.busy = false;
  return report;
}

export function describeCandidate(
  rig: HoistRigState,
  candidate: FloorCandidate,
): string {
  const floors = rig.platforms.map((p) => `${p.label}${candidate.floors[p.id]}层`).join("，");
  return `${floors}；能量 ${candidate.energy}，位移 ${candidate.movement}`;
}
