import { goalCells } from "@/features/atlas";
import { hoistClear } from "@/features/hoist/lib/orders";
import { sameCell } from "@/shared/document";
import type { GameDocument, Vec } from "@/shared/types";

export function filledGoals(document: GameDocument): Vec[] {
  return goalCells(document.level).filter((cell) =>
    document.level.boxes.some((box) => sameCell(box, cell)),
  );
}

export function goalsSatisfied(document: GameDocument): boolean {
  if (document.level.hoist) return hoistClear(document);
  const goals = goalCells(document.level);
  if (goals.length === 0) return false;
  return goals.every((cell) => document.level.boxes.some((box) => sameCell(box, cell)));
}

export function coverageLine(document: GameDocument): string {
  if (document.level.hoist) {
    const total = document.level.hoist.orders.length;
    const signed = document.level.hoist.readings.filter((reading) => reading.signed).length;
    return `${signed} / ${total} 张称重组已签收`;
  }
  const total = goalCells(document.level).length;
  const filled = filledGoals(document).length;
  return `${filled} / ${total} 个目标格已有箱子`;
}
