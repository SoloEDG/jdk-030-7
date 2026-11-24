import { ref } from "vue";
import { useAtlas } from "@/features/atlas";
import { useGadget } from "@/features/gadget";
import { useHauler } from "@/features/hauler";
import { useHoist } from "@/features/hoist";
import { firstFloorMismatchWarning } from "@/features/hoist/lib/orders";
import { useLedger } from "@/features/ledger";
import { loadInitial, useVoyage } from "@/features/voyage";
import type { Notice } from "@/shared/commands";
import type { Dir } from "@/shared/types";

export function useWorkshop() {
  const document = ref(loadInitial());
  const notice = ref<Notice>({
    tone: "info",
    message: "把对得上的箱子压上踏板；吊盘关要按重量、绳长和楼层一起算。",
  });
  const atlas = useAtlas(document);
  const hauler = useHauler(document);
  const gadget = useGadget(document);
  const ledger = useLedger(document);
  const voyage = useVoyage(document);
  const hoist = useHoist(document, { onSettled: announceHoistSettled });

  function notify(next: Notice): void {
    notice.value = next;
  }

  function refreshAndCheckClear(): boolean {
    gadget.refresh();
    const readings = hoist.evaluate();
    const clearedNow = ledger.checkClear();
    if (clearedNow) {
      voyage.commitClear();
      notify({
        tone: "success",
        message: `通关，用了 ${document.value.attempt.steps} 步。最佳记录已写入目录。`,
      });
      return true;
    }
    const mismatch = firstFloorMismatchWarning(readings);
    if (mismatch) notify({ tone: "warn", message: mismatch });
    return false;
  }

  function announceHoistSettled(): void {
    if (refreshAndCheckClear()) return;
    const rig = document.value.level.hoist;
    const report = rig?.last;
    if (!rig || !report?.chosenId) return;
    const candidate = report.candidates.find((item) => item.id === report.chosenId);
    if (!candidate) return;
    const movedNames = candidate.changedPlatformIds
      .map((id) => rig.platforms.find((p) => p.id === id)?.label ?? id)
      .join("、");
    const slackNames = report.newlySlackRopeIds
      .map((id) => rig.ropes.find((r) => r.id === id)?.label ?? id)
      .join("、");
    const floorText = rig.platforms
      .map((p) => `${p.label}→${candidate.floors[p.id]}层`)
      .join("，");
    notify({
      tone: "info",
      message: `已落锁：${floorText}。${movedNames ? `一起换层：${movedNames}。` : "各盘层位未变。"}${
        slackNames ? `新变松：${slackNames}。` : "没有绳由绷紧变松。"
      }现在可以跨接口继续推。`,
    });
  }

  function move(dir: Dir): void {
    const rig = document.value.level.hoist;
    if (rig?.busy) {
      notify({
        tone: "warn",
        message:
          rig.phase === "choosing"
            ? "存在同能量、同位移的停法；请在层位图选定一组并落锁。"
            : "吊盘正在换层落锁，停稳后才能跨接口继续推。",
      });
      return;
    }

    const result = hauler.tryMove(dir);
    if (!result.moved) {
      if (result.reason === "cleared") {
        notify({ tone: "warn", message: "本关已通关。重置或另选关卡后再推。" });
      } else if (result.reason === "busy") {
        notify({ tone: "warn", message: "吊盘尚未停稳落锁，不能跨接口推动。" });
      }
      return;
    }

    ledger.count(result);
    // Restore plate/door state immediately when a box leaves a scale plate;
    // order signing/win checks still wait until the hoist is locked.
    gadget.refresh();
    const waitingForHoist = hoist.handleMoveResult(result);
    if (waitingForHoist) {
      const active = document.value.level.hoist;
      if (active?.phase === "choosing") {
        notify({
          tone: "warn",
          message: "几组停法同能量且同位移。请在右侧层位图选一组，再点“按此组落锁”。",
        });
      } else {
        notify({
          tone: "info",
          message: "箱子已上盘：正在逐一枚举整层停法、核对绳长与能量；落锁前接口锁定。",
        });
      }
      return;
    }

    refreshAndCheckClear();
  }

  function lockTie(): void {
    hoist.lockSelected();
  }

  function reset(): void {
    hoist.cancel();
    voyage.resetLevel();
    notify({ tone: "info", message: "已重置当前关卡，最佳记录仍在。" });
  }

  function selectLevel(id: string): void {
    hoist.cancel();
    voyage.openLevel(id);
    notify({
      tone: "info",
      message: `进入「${document.value.level.title}」。${document.value.level.blurb}`,
    });
  }

  return {
    document,
    notice,
    atlas,
    hauler,
    gadget,
    ledger,
    voyage,
    hoist,
    move,
    lockTie,
    reset,
    selectLevel,
  };
}
