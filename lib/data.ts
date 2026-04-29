import { Block } from "./types";

export const NOW = "11:47";
export const DAY_NUMBER = 119;
export const TOTAL_DAYS = 365;
export const TODAY_LABEL = "Wed, Apr 29";

export const BLOCKS: Block[] = [
  {
    start: "04:00",
    end: "04:10",
    name: "Wake ritual",
    category: "passive",
    bricks: [
      { kind: "tick", name: "cold water", done: true },
      { kind: "tick", name: "brush", done: true },
      { kind: "tick", name: "lemon water", done: true },
    ],
  },
  {
    start: "04:10",
    end: "04:20",
    name: "Meditation",
    category: "mind",
    bricks: [{ kind: "time", name: "meditate", current: 10, target: 10 }],
  },
  {
    start: "04:20",
    end: "06:00",
    name: "Job apps",
    category: "career",
    bricks: [
      { kind: "goal", name: "apply", current: 5, target: 5 },
      { kind: "goal", name: "follow-ups", current: 4, target: 5 },
    ],
  },
  {
    start: "06:00",
    end: "07:00",
    name: "Fitness",
    category: "health",
    bricks: [
      { kind: "goal", name: "pushups", current: 80, target: 100 },
      { kind: "time", name: "run", current: 30, target: 30 },
      { kind: "tick", name: "stretch", done: true },
    ],
  },
  {
    start: "07:00",
    end: "07:15",
    name: "Cold shower",
    category: "health",
    bricks: [{ kind: "tick", name: "cold shower", done: true }],
  },
  {
    start: "07:15",
    end: "07:30",
    name: "Prayer",
    category: "mind",
    bricks: [{ kind: "tick", name: "prayer", done: true }],
  },
  {
    start: "07:30",
    end: "07:50",
    name: "Breakfast",
    category: "health",
    bricks: [{ kind: "tick", name: "breakfast", done: true }],
  },
  {
    start: "07:50",
    end: "08:00",
    name: "Walk to bus",
    category: "passive",
    bricks: [{ kind: "tick", name: "walk", done: true }],
  },
  {
    start: "08:00",
    end: "08:45",
    name: "Commute",
    category: "passive",
    bricks: [{ kind: "time", name: "read", current: 45, target: 45 }],
  },
  {
    start: "08:45",
    end: "17:15",
    name: "Work block",
    category: "passive",
    bricks: [
      { kind: "time", name: "deep work", current: 120, target: 240 },
      { kind: "goal", name: "meetings", current: 1, target: 3 },
      { kind: "tick", name: "lunch", done: false },
      { kind: "tick", name: "dinner", done: false },
    ],
  },
  {
    start: "17:15",
    end: "18:30",
    name: "Commute home",
    category: "passive",
    bricks: [{ kind: "tick", name: "decompress", done: false }],
  },
  {
    start: "18:30",
    end: "21:30",
    name: "Building AI",
    category: "career",
    bricks: [{ kind: "time", name: "code", current: 0, target: 180 }],
  },
  {
    start: "21:30",
    end: "21:40",
    name: "Face wash",
    category: "health",
    bricks: [
      { kind: "tick", name: "face wash", done: false },
      { kind: "tick", name: "brush", done: false },
    ],
  },
  {
    start: "21:40",
    end: "21:50",
    name: "Journal",
    category: "mind",
    bricks: [{ kind: "tick", name: "write", done: false }],
  },
  {
    start: "21:50",
    end: "22:00",
    name: "Meditation",
    category: "mind",
    bricks: [{ kind: "time", name: "meditate", current: 0, target: 10 }],
  },
  {
    start: "22:00",
    end: "04:00",
    name: "Sleep",
    category: "passive",
    bricks: [{ kind: "time", name: "sleep", current: 0, target: 360 }],
  },
];
