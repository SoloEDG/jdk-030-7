import type { HoistRigState } from "@/shared/hoist";

export function createFreightRig(): HoistRigState {
  return {
    floorHeight: 2.2,
    phase: "idle",
    busy: false,
    seq: 0,
    selectedCandidateId: null,
    readings: [],
    platforms: [
      {
        id: "p-a",
        label: "甲盘",
        floor: 1,
        initialFloor: 1,
        minFloor: 0,
        maxFloor: 2,
        stops: [0, 1, 2],
        mass: 2,
        cells: [
          { id: "a-nw", x: 6, y: 4, label: "甲西北厢" },
          { id: "a-ne", x: 7, y: 4, label: "甲东北厢" },
          { id: "a-sw", x: 6, y: 5, label: "甲西南厢" },
          { id: "a-se", x: 7, y: 5, label: "甲东南厢" },
        ],
      },
      {
        id: "p-b",
        label: "乙盘",
        floor: 1,
        initialFloor: 1,
        minFloor: 0,
        maxFloor: 2,
        stops: [0, 1, 2],
        mass: 2,
        cells: [
          { id: "b-w", x: 11, y: 5, label: "乙西厢" },
          { id: "b-e", x: 12, y: 5, label: "乙东厢" },
        ],
      },
    ],
    pulleys: [
      { id: "py-a-l", platformId: "p-a", x: 6.2 },
      { id: "py-a-r", platformId: "p-a", x: 7.8 },
      { id: "py-b-l", platformId: "p-b", x: 11.2 },
      { id: "py-b-r", platformId: "p-b", x: 12.8 },
    ],
    ropes: [
      {
        id: "r1",
        label: "左绳",
        length: 8.46,
        color: "#c9a36a",
        anchors: [
          { x: 5.7, z: 6.6 },
          { x: 6.7, z: 6.6 },
        ],
        pulleyIds: ["py-a-l"],
      },
      {
        id: "r2",
        label: "联绳",
        length: 14.08,
        color: "#7ec8c8",
        anchors: [
          { x: 7.3, z: 6.6 },
          { x: 11.7, z: 6.6 },
        ],
        pulleyIds: ["py-a-r", "py-b-l"],
      },
      {
        id: "r3",
        label: "右绳",
        length: 12.85,
        color: "#b56a32",
        anchors: [
          { x: 12.3, z: 6.6 },
          { x: 13.3, z: 6.6 },
        ],
        pulleyIds: ["py-b-r"],
      },
    ],
    orders: [
      {
        id: "o-iron-0",
        code: "铁单-0",
        title: "12 单位铁件落 0 层",
        floor: 0,
        exactWeight: 12,
        cells: [{ x: 11, y: 6 }],
      },
      {
        id: "o-timber-1",
        code: "木单-1",
        title: "4 单位木箱落 1 层",
        floor: 1,
        exactWeight: 4,
        cells: [{ x: 5, y: 5 }],
      },
    ],
  };
}

export function createTieRig(): HoistRigState {
  return {
    floorHeight: 2.2,
    phase: "idle",
    busy: false,
    seq: 0,
    selectedCandidateId: null,
    readings: [],
    platforms: [
      {
        id: "p-a",
        label: "甲盘",
        floor: 2,
        initialFloor: 2,
        minFloor: 0,
        maxFloor: 2,
        stops: [0, 1, 2],
        mass: 2,
        cells: [
          { id: "a-w", x: 5, y: 4, label: "甲西厢" },
          { id: "a-e", x: 6, y: 4, label: "甲东厢" },
        ],
      },
      {
        id: "p-b",
        label: "乙盘",
        floor: 2,
        initialFloor: 2,
        minFloor: 0,
        maxFloor: 2,
        stops: [0, 1, 2],
        mass: 2,
        cells: [
          { id: "b-w", x: 10, y: 4, label: "乙西厢" },
          { id: "b-e", x: 11, y: 4, label: "乙东厢" },
        ],
      },
    ],
    pulleys: [
      { id: "py-a-l", platformId: "p-a", x: 5.3 },
      { id: "py-a-r", platformId: "p-a", x: 6.7 },
      { id: "py-b-l", platformId: "p-b", x: 10.3 },
      { id: "py-b-r", platformId: "p-b", x: 11.7 },
    ],
    ropes: [
      {
        id: "r1",
        label: "左绳",
        length: 12.85,
        color: "#c9a36a",
        anchors: [
          { x: 4.8, z: 6.6 },
          { x: 5.8, z: 6.6 },
        ],
        pulleyIds: ["py-a-l"],
      },
      {
        id: "r2",
        label: "联绳",
        length: 14.2,
        color: "#7ec8c8",
        anchors: [
          { x: 6.2, z: 6.6 },
          { x: 10.8, z: 6.6 },
        ],
        pulleyIds: ["py-a-r", "py-b-l"],
      },
      {
        id: "r3",
        label: "右绳",
        length: 12.85,
        color: "#b56a32",
        anchors: [
          { x: 11.2, z: 6.6 },
          { x: 12.2, z: 6.6 },
        ],
        pulleyIds: ["py-b-r"],
      },
    ],
    orders: [
      {
        id: "o-timber-1",
        code: "称重组-1",
        title: "4 单位木箱必须交 1 层",
        floor: 1,
        exactWeight: 4,
        cells: [{ x: 7, y: 4 }],
      },
    ],
  };
}
