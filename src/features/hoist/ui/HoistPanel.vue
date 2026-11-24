<script setup lang="ts">
import { computed, ref, watch } from "vue";
import {
  findCandidate,
  newlySlackFor,
  ropePathPoints,
  ropeSlack,
  supportRopeIds,
} from "../lib/rig";
import { boxWeight, type FloorCandidate, type HoistPlatform, type PlatformCell, type RopeDef } from "@/shared/hoist";
import { sameCell } from "@/shared/document";
import type { GameDocument } from "@/shared/types";

const props = defineProps<{
  document: GameDocument;
  tiedCandidates: FloorCandidate[];
  selectedCandidateId: string | null;
}>();

const emit = defineEmits<{
  selectCandidate: [id: string];
  lock: [];
}>();

const rig = computed(() => props.document.level.hoist);
const report = computed(() => rig.value?.pending ?? rig.value?.last);
const previewCandidate = computed(() =>
  findCandidate(
    report.value ?? undefined,
    rig.value?.selectedCandidateId ?? report.value?.bestId,
  ),
);

const activePlatformId = ref<string | null>(rig.value?.platforms[0]?.id ?? null);
watch(
  () => rig.value?.seq,
  () => {
    activePlatformId.value = rig.value?.last?.triggerPlatformId ?? activePlatformId.value;
  },
);

const W = 330;
const H = 286;
const PAD = 34;

const bounds = computed(() => {
  const current = rig.value;
  if (!current) return { minX: 0, maxX: 14, minZ: -0.5, maxZ: 8 };
  const xs: number[] = [];
  const zs: number[] = [-0.4];
  for (const rope of current.ropes) {
    xs.push(rope.anchors[0].x, rope.anchors[1].x);
    zs.push(rope.anchors[0].z, rope.anchors[1].z);
    for (const pulley of current.pulleys) xs.push(pulley.x);
  }
  for (const platform of current.platforms) {
    for (const cell of platform.cells) xs.push(cell.x, cell.x + 1);
  }
  const minX = Math.min(...xs) - 0.55;
  const maxX = Math.max(...xs) + 0.55;
  const maxZ = Math.max(...zs) + 0.65;
  return { minX, maxX, minZ: -0.55, maxZ };
});

function xPos(x: number): number {
  const { minX, maxX } = bounds.value;
  return PAD + ((x - minX) / (maxX - minX)) * (W - PAD * 2);
}

function zPos(z: number): number {
  const { minZ, maxZ } = bounds.value;
  return H - PAD - ((z - minZ) / (maxZ - minZ)) * (H - PAD * 2);
}

const viewFloors = computed<Record<string, number>>(() => {
  const current = rig.value;
  if (!current) return {};
  if (previewCandidate.value) return previewCandidate.value.floors;
  return Object.fromEntries(current.platforms.map((p) => [p.id, p.floor]));
});

const activeSupportRopeIds = computed(() => {
  const current = rig.value;
  if (!current || !activePlatformId.value) return new Set<string>();
  return new Set(supportRopeIds(current, activePlatformId.value));
});

const alertRopeIds = computed(() => {
  const current = rig.value;
  const activeReport = report.value;
  const candidate = previewCandidate.value;
  if (!current || !activeReport || !candidate) return new Set<string>();
  return new Set(newlySlackFor(current, activeReport.before, candidate.slack));
});

function ropePoints(rope: RopeDef): string {
  const current = rig.value;
  if (!current) return "";
  return ropePathPoints(current, rope, viewFloors.value)
    .map((point) => `${xPos(point.x).toFixed(1)},${zPos(point.z).toFixed(1)}`)
    .join(" ");
}

function ropeSlackValue(rope: RopeDef): number {
  const candidate = previewCandidate.value;
  if (candidate?.slack[rope.id] != null) return candidate.slack[rope.id];
  const current = rig.value;
  if (!current) return 0;
  return Math.max(0, ropeSlack(current, rope, viewFloors.value));
}

function platformX0(platform: HoistPlatform): number {
  return Math.min(...platform.cells.map((cell) => cell.x));
}

function platformX1(platform: HoistPlatform): number {
  return Math.max(...platform.cells.map((cell) => cell.x)) + 1;
}

function platformZ(platform: HoistPlatform): number {
  const floor = viewFloors.value[platform.id] ?? platform.floor;
  return floor * (rig.value?.floorHeight ?? 2.2);
}

function actualZ(platform: HoistPlatform): number {
  return platform.floor * (rig.value?.floorHeight ?? 2.2);
}

function boxAt(cell: PlatformCell) {
  return props.document.level.boxes.find((box) => sameCell(box, cell));
}

function loadedCells(platform: HoistPlatform): { cell: PlatformCell; weight: number; boxId: string }[] {
  return platform.cells
    .map((cell) => {
      const box = boxAt(cell);
      return box ? { cell, weight: boxWeight(box), boxId: box.id } : null;
    })
    .filter((item): item is { cell: PlatformCell; weight: number; boxId: string } => Boolean(item));
}

function platformWeight(platform: HoistPlatform): number {
  return platform.mass + loadedCells(platform).reduce((sum, item) => sum + item.weight, 0);
}

function selectPlatform(id: string): void {
  activePlatformId.value = id;
}

function candidateLabel(candidate: FloorCandidate): string {
  const current = rig.value;
  if (!current) return candidate.id;
  return current.platforms.map((p) => `${p.label} ${candidate.floors[p.id]}F`).join(" / ");
}

function platformNames(ids: string[]): string {
  const current = rig.value;
  if (!current || ids.length === 0) return "无";
  return ids.map((id) => current.platforms.find((p) => p.id === id)?.label ?? id).join("、");
}

function ropeNames(ids: string[]): string {
  const current = rig.value;
  if (!current || ids.length === 0) return "无";
  return ids.map((id) => current.ropes.find((r) => r.id === id)?.label ?? id).join("、");
}

function supportRopeLabels(platformId: string): string {
  const current = rig.value;
  if (!current) return "";
  return ropeNames(supportRopeIds(current, platformId));
}

const alertRopeIdList = computed(() => [...alertRopeIds.value]);
</script>

<template>
  <section v-if="rig" class="panel hoist-panel" aria-label="吊盘绳长与称重组">
    <h2>吊盘层位图</h2>
    <p class="lede">
      三绳穿过动滑轮，联绳会让多盘一起换层；枚举全部整层停法后，按能量、位移和人工同优选择落锁。
    </p>

    <div class="rig-stage">
      <svg :viewBox="`0 0 ${W} ${H}`" role="img" aria-label="绳索、动滑轮、吊盘楼层和承载厢格">
        <g class="floor-guides">
          <line
            v-for="floor in [0, 1, 2]"
            :key="`guide-${floor}`"
            :x1="PAD - 8"
            :x2="W - PAD + 8"
            :y1="zPos(floor * rig.floorHeight)"
            :y2="zPos(floor * rig.floorHeight)"
          />
          <text
            v-for="floor in [0, 1, 2]"
            :key="`label-${floor}`"
            :x="6"
            :y="zPos(floor * rig.floorHeight) + 4"
            class="floor-label"
          >{{ floor }}F</text>
        </g>

        <g v-for="rope in rig.ropes" :key="rope.id" class="rope-group">
          <polyline
            :points="ropePoints(rope)"
            class="rope"
            :class="{
              support: activeSupportRopeIds.has(rope.id),
              alert: alertRopeIds.has(rope.id),
              slack: ropeSlackValue(rope) > 0.05,
            }"
            :stroke="rope.color ?? '#c9a36a'"
          />
          <rect
            :x="xPos(rope.anchors[0].x) - 4"
            :y="zPos(rope.anchors[0].z) - 4"
            width="8"
            height="8"
            class="anchor"
          />
          <rect
            :x="xPos(rope.anchors[1].x) - 4"
            :y="zPos(rope.anchors[1].z) - 4"
            width="8"
            height="8"
            class="anchor"
          />
          <text
            :x="(xPos(rope.anchors[0].x) + xPos(rope.anchors[1].x)) / 2"
            :y="18"
            class="rope-label"
            :fill="rope.color"
          >{{ rope.label }} Δ{{ ropeSlackValue(rope).toFixed(2) }}</text>
        </g>

        <g v-for="pulley in rig.pulleys" :key="pulley.id">
          <circle
            :cx="xPos(pulley.x)"
            :cy="zPos((viewFloors[pulley.platformId] ?? 0) * rig.floorHeight + (pulley.zOffset ?? 0.2))"
            r="6"
            class="pulley"
          />
          <circle
            :cx="xPos(pulley.x)"
            :cy="zPos((viewFloors[pulley.platformId] ?? 0) * rig.floorHeight + (pulley.zOffset ?? 0.2))"
            r="2"
            class="pulley-core"
          />
        </g>

        <g
          v-for="platform in rig.platforms"
          :key="platform.id"
          class="platform-group"
          @click="selectPlatform(platform.id)"
        >
          <rect
            v-if="previewCandidate && previewCandidate.floors[platform.id] !== platform.floor"
            :x="xPos(platformX0(platform))"
            :y="zPos(actualZ(platform) + 0.16)"
            :width="xPos(platformX1(platform)) - xPos(platformX0(platform))"
            height="10"
            rx="3"
            class="platform-ghost"
          />
          <rect
            :x="xPos(platformX0(platform))"
            :y="zPos(platformZ(platform) + 0.18)"
            :width="xPos(platformX1(platform)) - xPos(platformX0(platform))"
            height="11"
            rx="3"
            class="platform"
            :class="{ active: activePlatformId === platform.id }"
          />
          <text
            :x="xPos(platformX0(platform))"
            :y="zPos(platformZ(platform) + 0.55) - 8"
            class="platform-label"
          >{{ platform.label }} · {{ viewFloors[platform.id] ?? platform.floor }}层 · W{{ platformWeight(platform) }}</text>

          <g v-for="item in loadedCells(platform)" :key="item.boxId">
            <rect
              :x="xPos(item.cell.x + 0.12)"
              :y="zPos(platformZ(platform) + 0.95) - 26 - (item.cell.y % 2) * 7"
              width="20"
              height="15"
              rx="2"
              class="cargo-chip"
            />
            <text
              :x="xPos(item.cell.x + 0.52)"
              :y="zPos(platformZ(platform) + 0.95) - 15 - (item.cell.y % 2) * 7"
              class="cargo-text"
            >{{ item.weight }}</text>
            <title>{{ item.cell.label }}：{{ item.weight }} 单位</title>
          </g>
        </g>
      </svg>
    </div>

    <ul class="rig-limits">
      <li v-for="platform in rig.platforms" :key="`limit-${platform.id}`">
        {{ platform.label }}：限位 {{ platform.minFloor }}–{{ platform.maxFloor }}F，整层锁点
        {{ platform.stops.join("/") }}F；共托绳
        {{ supportRopeLabels(platform.id) }}
      </li>
    </ul>

    <div class="rig-status" :data-phase="rig.phase">
      <strong>
        {{
          rig.phase === "choosing"
            ? "同优待选"
            : rig.phase === "settling"
              ? "换层中…"
              : rig.phase === "locked"
                ? "已停稳落锁"
                : "待命"
        }}
      </strong>
      <span v-if="report">
        候选 {{ report.candidates.length }} 组；
        <template v-if="previewCandidate">
          能量 {{ previewCandidate.energy }}，总位移 {{ previewCandidate.movement }}
        </template>
      </span>
    </div>

    <div v-if="tiedCandidates.length" class="candidate-list" role="radiogroup" aria-label="同优停法">
      <h3>同优停法：在层位图选一组再落锁</h3>
      <button
        v-for="candidate in tiedCandidates"
        :key="candidate.id"
        type="button"
        class="candidate"
        :class="{ current: selectedCandidateId === candidate.id }"
        role="radio"
        :aria-checked="selectedCandidateId === candidate.id"
        @click="emit('selectCandidate', candidate.id)"
      >
        <span>{{ candidateLabel(candidate) }}</span>
        <small>E={{ candidate.energy }} · 位移={{ candidate.movement }}</small>
      </button>
      <button type="button" class="lock-button" @click="emit('lock')">按此组落锁并放行接口</button>
    </div>

    <div v-else-if="previewCandidate" class="candidate-readout">
      <p>{{ candidateLabel(previewCandidate) }}</p>
      <p class="lede">
        换层盘：{{ platformNames(previewCandidate.changedPlatformIds) }}；
        变松绳：{{ ropeNames(alertRopeIdList) }}
      </p>
    </div>

    <h3>称重组与楼层签收</h3>
    <ul class="orders">
      <li v-for="reading in rig.readings" :key="reading.orderId" :data-signed="reading.signed">
        <b>{{ reading.signed ? "已签收" : reading.alignedWrongFloorBoxIds.length ? "错层拒收" : "待称重" }}</b>
        <span>{{ reading.message }}</span>
      </li>
      <li v-if="rig.readings.length === 0" class="lede">推动一次箱子后显示称重读数。</li>
    </ul>
  </section>

  <section v-else class="panel hoist-panel">
    <h2>吊盘层位图</h2>
    <p class="lede">本关是普通踏板机关；进入“吊盘称重分流”或“同优层位锁”可查看绳长、动滑轮与楼层签收。</p>
  </section>
</template>
