import { createFreightRig, createTieRig } from "@/features/hoist/lib/demoRig";
import { createId } from "@/shared/document";
import type { HoistRigState } from "@/shared/hoist";
import type {
  BoxKind,
  FloorMorph,
  RuntimeLevel,
  TileKind,
} from "@/shared/types";

export interface LevelBlueprint {
  id: string;
  title: string;
  blurb: string;
  rows: string[];
  player: { x: number; y: number };
  boxes: { kind: BoxKind; x: number; y: number; weight?: number; floor?: number }[];
  plates: {
    accept: BoxKind;
    x: number;
    y: number;
    doorIds: string[];
    floorIds: string[];
    floor?: number;
    orderId?: string;
    targetWeight?: number;
  }[];
  doors: { id: string; x: number; y: number; floor?: number }[];
  floors: { id: string; x: number; y: number; morph: FloorMorph }[];
  hoist?: HoistRigState;
}

function tilesOf(rows: string[]): TileKind[][] {
  return rows.map((row) =>
    [...row].map((ch) => {
      if (ch === "#") return "wall";
      if (ch === "*") return "goal";
      if (ch === "~") return "gap";
      return "floor";
    }),
  );
}

export const LEVELS: LevelBlueprint[] = [
  {
    id: "hoist-01",
    title: "吊盘称重分流",
    blurb: "先在右侧把铁箱推入乙盘，观察联绳带动甲盘换层与左绳变松；铁箱交 0 层后，再把木箱推入甲盘并退回 1 层木秤板。",
    rows: [
      "###############",
      "#.............#",
      "#.............#",
      "#.............#",
      "#.....PP......#",
      "#....oPPo..QQ.#",
      "#....D.....oD.#",
      "#.............#",
      "#.............#",
      "###############",
    ],
    player: { x: 13, y: 5 },
    boxes: [
      { kind: "iron", x: 12, y: 5, floor: 1 },
      { kind: "timber", x: 2, y: 5 },
      { kind: "glass", x: 2, y: 3 },
      { kind: "iron", x: 2, y: 7 },
    ],
    plates: [
      {
        accept: "timber",
        x: 5,
        y: 5,
        floor: 1,
        orderId: "o-timber-1",
        targetWeight: 4,
        doorIds: ["d-timber"],
        floorIds: [],
      },
      {
        accept: "iron",
        x: 8,
        y: 5,
        floor: 2,
        targetWeight: 12,
        doorIds: [],
        floorIds: [],
      },
      {
        accept: "iron",
        x: 11,
        y: 6,
        floor: 0,
        orderId: "o-iron-0",
        targetWeight: 12,
        doorIds: ["d-iron"],
        floorIds: [],
      },
    ],
    doors: [
      { id: "d-timber", x: 5, y: 6 },
      { id: "d-iron", x: 12, y: 6 },
    ],
    floors: [],
    hoist: createFreightRig(),
  },
  {
    id: "hoist-02",
    title: "同优层位锁",
    blurb: "第一次推箱会得到三组同能量、同位移停法。请在层位图中选择 1 层方案再落锁；选成 0 或 2 层时，平面坐标虽对齐也会被称重组拒收。",
    rows: [
      "#############",
      "#...........#",
      "#...........#",
      "#...........#",
      "#....PPoD.QQ#",
      "#...........#",
      "#...........#",
      "#...........#",
      "#############",
    ],
    player: { x: 4, y: 4 },
    boxes: [
      { kind: "timber", x: 5, y: 4, floor: 2 },
      { kind: "timber", x: 10, y: 4, floor: 2 },
    ],
    plates: [
      {
        accept: "timber",
        x: 7,
        y: 4,
        floor: 1,
        orderId: "o-timber-1",
        targetWeight: 4,
        doorIds: ["d-tie"],
        floorIds: [],
      },
    ],
    doors: [{ id: "d-tie", x: 8, y: 4 }],
    floors: [],
    hoist: createTieRig(),
  },
  {
    id: "latch-01",
    title: "门闩入门",
    blurb: "木箱压上木踏板才会开门。多出来的箱子用来压住开关。",
    rows: [
      "#########",
      "#.......#",
      "#.......#",
      "#.......#",
      "#.......#",
      "###...###",
      "#......*#",
      "#......*#",
      "#########",
    ],
    player: { x: 1, y: 2 },
    boxes: [
      { kind: "timber", x: 3, y: 3 },
      { kind: "timber", x: 4, y: 3 },
      { kind: "timber", x: 3, y: 7 },
    ],
    plates: [{ accept: "timber", x: 3, y: 4, doorIds: ["d1"], floorIds: [] }],
    doors: [{ id: "d1", x: 4, y: 5 }],
    floors: [],
  },
  {
    id: "latch-02",
    title: "认材",
    blurb: "铁踏板只认铁箱。木箱压上去门不会动。",
    rows: [
      "##########",
      "#........#",
      "#........#",
      "#........#",
      "#........#",
      "####...###",
      "#.......*#",
      "#.......*#",
      "##########",
    ],
    player: { x: 1, y: 2 },
    boxes: [
      { kind: "timber", x: 5, y: 4 },
      { kind: "iron", x: 6, y: 3 },
      { kind: "timber", x: 3, y: 7 },
    ],
    plates: [{ accept: "iron", x: 6, y: 4, doorIds: ["d1"], floorIds: [] }],
    doors: [{ id: "d1", x: 5, y: 5 }],
    floors: [],
  },
  {
    id: "latch-03",
    title: "架桥",
    blurb: "木踏板升起缺口上的桥板。铁箱过桥后，木箱去压本侧目标。",
    rows: [
      "###########",
      "#........*#",
      "#.........#",
      "#.........#",
      "#~~~~~~~~~#",
      "#.........#",
      "#........*#",
      "#.........#",
      "###########",
    ],
    player: { x: 1, y: 2 },
    boxes: [
      { kind: "timber", x: 3, y: 2 },
      { kind: "iron", x: 4, y: 3 },
    ],
    plates: [{ accept: "timber", x: 3, y: 3, doorIds: [], floorIds: ["b1", "b2", "b3"] }],
    doors: [],
    floors: [
      { id: "b1", x: 3, y: 4, morph: "bridge" },
      { id: "b2", x: 4, y: 4, morph: "bridge" },
      { id: "b3", x: 5, y: 4, morph: "bridge" },
    ],
  },
  {
    id: "latch-04",
    title: "封廊",
    blurb: "先把一只木箱送进左侧目标，再压踏板。踏板会封住那条廊并打开右侧的门。",
    rows: [
      "##########",
      "#........#",
      "#........#",
      "#........#",
      "#........#",
      "##.##..###",
      "#*......*#",
      "#........#",
      "##########",
    ],
    player: { x: 1, y: 2 },
    boxes: [
      { kind: "timber", x: 2, y: 6 },
      { kind: "timber", x: 4, y: 2 },
      { kind: "timber", x: 6, y: 4 },
    ],
    plates: [{ accept: "timber", x: 4, y: 3, doorIds: ["d1"], floorIds: ["s1"] }],
    doors: [{ id: "d1", x: 5, y: 5 }],
    floors: [{ id: "s1", x: 2, y: 5, morph: "seal" }],
  },
  {
    id: "latch-05",
    title: "双色闸",
    blurb: "玻璃踏板与木踏板各管一扇门。两只箱子都要过闸到达目标。",
    rows: [
      "###########",
      "#.........#",
      "#.........#",
      "#.........#",
      "##...#...##",
      "#.........#",
      "#*.......*#",
      "#.........#",
      "###########",
    ],
    player: { x: 1, y: 2 },
    boxes: [
      { kind: "timber", x: 2, y: 2 },
      { kind: "glass", x: 8, y: 2 },
      { kind: "timber", x: 3, y: 3 },
      { kind: "glass", x: 7, y: 3 },
    ],
    plates: [
      { accept: "timber", x: 2, y: 3, doorIds: ["west"], floorIds: [] },
      { accept: "glass", x: 8, y: 3, doorIds: ["east"], floorIds: [] },
    ],
    doors: [
      { id: "west", x: 3, y: 4 },
      { id: "east", x: 7, y: 4 },
    ],
    floors: [],
  },
];

export function getLevel(id: string): LevelBlueprint {
  const found = LEVELS.find((level) => level.id === id);
  if (!found) throw new Error(`未知关卡 ${id}`);
  return found;
}

export function hydrate(blueprint: LevelBlueprint): RuntimeLevel {
  return {
    id: blueprint.id,
    title: blueprint.title,
    blurb: blueprint.blurb,
    width: blueprint.rows[0].length,
    height: blueprint.rows.length,
    tiles: tilesOf(blueprint.rows),
    player: { ...blueprint.player },
    boxes: blueprint.boxes.map((box) => ({ ...box, id: createId(box.kind) })),
    plates: blueprint.plates.map((plate, index) => ({
      ...plate,
      id: `p-${blueprint.id}-${index}`,
      powered: false,
    })),
    doors: blueprint.doors.map((door) => ({ ...door, open: false })),
    floors: blueprint.floors.map((floor) => ({ ...floor, active: false })),
    hoist: blueprint.hoist ? structuredClone(blueprint.hoist) : undefined,
  };
}
