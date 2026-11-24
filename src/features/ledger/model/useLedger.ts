import { computed, type Ref } from "vue";
import { countMove, markCleared } from "../lib/steps";
import { coverageLine, goalsSatisfied } from "../lib/win";
import type { GameDocument } from "@/shared/types";
import type { MoveResult } from "@/shared/types";

export function useLedger(document: Ref<GameDocument>) {
  const steps = computed(() => document.value.attempt.steps);
  const status = computed(() => document.value.attempt.status);
  const coverage = computed(() => coverageLine(document.value));

  function count(result: MoveResult): boolean {
    return countMove(document.value, result);
  }

  function checkClear(): boolean {
    if (document.value.attempt.status === "cleared") return false;
    if (!goalsSatisfied(document.value)) return false;
    return markCleared(document.value);
  }

  function afterMove(result: MoveResult): { counted: boolean; cleared: boolean } {
    const counted = count(result);
    if (!counted) return { counted: false, cleared: false };
    return { counted: true, cleared: checkClear() };
  }

  return {
    steps,
    status,
    coverage,
    afterMove,
    count,
    checkClear,
    goalsSatisfied: () => goalsSatisfied(document.value),
  };
}
