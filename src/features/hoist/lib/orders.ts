import { boxFloor, boxWeight, type OrderReading } from "@/shared/hoist";
import { sameCell } from "@/shared/document";
import type { GameDocument } from "@/shared/types";

export function evaluateOrders(document: GameDocument): OrderReading[] {
  const rig = document.level.hoist;
  if (!rig) return [];
  const readings = rig.orders.map((order): OrderReading => {
    const matched = document.level.boxes.filter(
      (box) =>
        boxFloor(box) === order.floor &&
        order.cells.some((cell) => sameCell(cell, box)),
    );
    const wrongFloor = document.level.boxes.filter(
      (box) =>
        boxFloor(box) !== order.floor &&
        order.cells.some((cell) => sameCell(cell, box)),
    );
    const weight = matched.reduce((sum, box) => sum + boxWeight(box), 0);
    const tolerance = order.tolerance ?? 0.001;
    const signed = Math.abs(weight - order.exactWeight) <= tolerance;
    let message: string;
    if (signed) {
      message = `${order.code} 已称重签收：${weight} 单位，${order.floor} 层`;
    } else if (wrongFloor.length > 0) {
      message = `平面坐标已对齐，但楼层为 ${wrongFloor
        .map((box) => boxFloor(box))
        .join("/")} 层；本单只签 ${order.floor} 层，拒收`;
    } else if (weight > 0) {
      message = `称重 ${weight} / ${order.exactWeight} 单位，未达接单重量`;
    } else {
      message = `等待 ${order.floor} 层接驳口交货，目标 ${order.exactWeight} 单位`;
    }
    return {
      orderId: order.id,
      weight,
      boxIds: matched.map((box) => box.id),
      alignedWrongFloorBoxIds: wrongFloor.map((box) => box.id),
      signed,
      message,
    };
  });
  rig.readings = readings;
  return readings;
}

export function hoistClear(document: GameDocument): boolean {
  const rig = document.level.hoist;
  if (!rig || rig.orders.length === 0) return false;
  if (rig.busy || rig.phase === "choosing" || rig.phase === "settling") return false;
  return rig.orders.every((order) =>
    rig.readings.some((reading) => reading.orderId === order.id && reading.signed),
  );
}

export function firstFloorMismatchWarning(readings: OrderReading[]): string | null {
  const bad = readings.find((reading) => reading.alignedWrongFloorBoxIds.length > 0);
  return bad?.message ?? null;
}
