import { computed, onUnmounted, type Ref } from "vue";
import { evaluateOrders } from "../lib/orders";
import {
  commitCandidate,
  computeReport,
  findCandidate,
} from "../lib/rig";
import type { OrderReading } from "@/shared/hoist";
import type { GameDocument, MoveResult } from "@/shared/types";

const SETTLE_MS = 850;

export interface HoistHooks {
  onSettled?: () => void;
}

export function useHoist(document: Ref<GameDocument>, hooks: HoistHooks = {}) {
  let timer: number | null = null;

  const rig = computed(() => document.value.level.hoist);
  const busy = computed(() => rig.value?.busy ?? false);
  const report = computed(() => rig.value?.last ?? rig.value?.pending ?? null);
  const pending = computed(() => rig.value?.pending ?? null);

  const selectedCandidate = computed(() => {
    const current = rig.value;
    if (!current) return undefined;
    const source = current.pending ?? current.last;
    return findCandidate(source ?? undefined, current.selectedCandidateId ?? current.last?.bestId);
  });

  const tiedCandidates = computed(() => {
    const current = rig.value;
    const activeReport = current?.pending;
    if (!current || current.phase !== "choosing" || !activeReport || activeReport.status !== "tie") {
      return [];
    }
    return activeReport.tieIds
      .map((id) => findCandidate(activeReport, id))
      .filter((candidate): candidate is NonNullable<typeof candidate> => Boolean(candidate));
  });

  function clearTimer(): void {
    if (timer != null) {
      window.clearTimeout(timer);
      timer = null;
    }
  }

  function evaluate(): OrderReading[] {
    return evaluateOrders(document.value);
  }

  function finishCandidate(candidateId: string): void {
    clearTimer();
    const committed = commitCandidate(document.value, candidateId);
    timer = null;
    if (committed) {
      evaluateOrders(document.value);
      hooks.onSettled?.();
    }
  }

  function handleMoveResult(result: MoveResult): boolean {
    const current = document.value.level.hoist;
    if (!current || !result.moved || !result.hoist || result.hoist.platformIds.length === 0) {
      return false;
    }
    clearTimer();
    current.seq += 1;
    const triggerPlatformId =
      result.hoist.platformIds[result.hoist.platformIds.length - 1] ??
      result.hoist.platformIds[0];
    const nextReport = computeReport(
      document.value,
      triggerPlatformId,
      current.seq,
      result.boxId,
    );
    current.last = nextReport;
    current.pending = nextReport;

    if (nextReport.status === "none" || !nextReport.bestId) {
      current.phase = "idle";
      current.busy = false;
      current.pending = undefined;
      return false;
    }

    if (nextReport.status === "tie") {
      current.phase = "choosing";
      current.busy = true;
      current.selectedCandidateId = nextReport.tieIds[0] ?? null;
      return true;
    }

    current.phase = "settling";
    current.busy = true;
    current.selectedCandidateId = nextReport.bestId;
    const candidateId = nextReport.bestId;
    timer = window.setTimeout(() => finishCandidate(candidateId), SETTLE_MS);
    return true;
  }

  function selectCandidate(candidateId: string): void {
    const current = rig.value;
    if (!current || current.phase !== "choosing") return;
    current.selectedCandidateId = candidateId;
  }

  function lockSelected(): boolean {
    const current = rig.value;
    if (!current || current.phase !== "choosing" || !current.selectedCandidateId) return false;
    finishCandidate(current.selectedCandidateId);
    return true;
  }

  function cancel(): void {
    clearTimer();
  }

  onUnmounted(clearTimer);

  return {
    rig,
    busy,
    report,
    pending,
    selectedCandidate,
    tiedCandidates,
    handleMoveResult,
    selectCandidate,
    lockSelected,
    evaluate,
    cancel,
  };
}
