import { boxAt } from "./occupancy";
import { isPassable } from "@/features/gadget";
import { platformAtCell } from "@/features/hoist/lib/rig";
import { addVec } from "@/shared/document";
import { DIR_VEC, type Dir, type GameDocument, type MoveResult } from "@/shared/types";

export function applyMove(document: GameDocument, dir: Dir): MoveResult {
  if (document.attempt.status === "cleared") return { moved: false, pushed: false, reason: "cleared" };
  if (document.level.hoist?.busy) return { moved: false, pushed: false, reason: "busy" };
  const delta = DIR_VEC[dir];
  const next = addVec(document.level.player, delta);
  const box = boxAt(document, next);
  if (box) {
    const beyond = addVec(box, delta);
    if (!isPassable(document, beyond, { ignoreBoxId: box.id, ignorePlayer: true })) {
      return { moved: false, pushed: false, reason: "blocked" };
    }
    const from = { x: box.x, y: box.y };
    const sourcePlatform = platformAtCell(document.level.hoist, from);
    box.x = beyond.x;
    box.y = beyond.y;
    const destinationPlatform = platformAtCell(document.level.hoist, beyond);
    document.level.player = next;
    const platformIds = [sourcePlatform?.id, destinationPlatform?.id].filter(
      (id, index, all): id is string => Boolean(id) && all.indexOf(id) === index,
    );
    return {
      moved: true,
      pushed: true,
      boxId: box.id,
      hoist: platformIds.length
        ? { boxId: box.id, platformIds, from, to: beyond }
        : undefined,
    };
  }
  if (!isPassable(document, next)) return { moved: false, pushed: false, reason: "blocked" };
  document.level.player = next;
  return { moved: true, pushed: false };
}
