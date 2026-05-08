// lib/types.ts — re-authored for M3 (plan.md § Data model).
// M2: Brick stub with old field names (current/target) replaced.
// M3: Full Brick discriminated union with id/categoryId/parentBlockId per locked schema.

// Brick — REPLACES M2's stub. Adds id/categoryId/parentBlockId; renames goal/time progress fields.
type BrickBase = {
  id: string; // crypto.randomUUID via lib/uuid.ts
  name: string;
  categoryId: string | null; // FK to AppState.categories; null = uncategorized
  parentBlockId: string | null; // FK to AppState.blocks; null = standalone (loose)
};

export type Brick =
  | (BrickBase & { kind: "tick"; done: boolean })
  | (BrickBase & { kind: "goal"; target: number; unit: string; count: number })
  | (BrickBase & { kind: "time"; durationMin: number; minutesDone: number });

// Recurrence discriminated union — locked by ADR-019.
// custom-range weekdays: 0=Sun..6=Sat.
export type Recurrence =
  | { kind: "just-today"; date: string } // ISO YYYY-MM-DD
  | { kind: "every-weekday" } // Mon–Fri
  | { kind: "every-day" }
  | { kind: "custom-range"; start: string; end: string; weekdays: number[] };

// Category object — ADR-032. No closed-set names in code (see plan.md § 0.14).
export type Category = {
  id: string; // crypto.randomUUID()
  name: string; // user-typed; not unique (AC #30)
  color: string; // one of var(--cat-1)..var(--cat-12) hex
};

// Block — locked schema for M2+.
export type Block = {
  id: string; // uuid
  name: string;
  start: string; // "HH:MM"
  end?: string; // "HH:MM" — half-open [start, end) per ADR-006
  recurrence: Recurrence;
  categoryId: string | null; // FK; null = uncategorized (SG-m2-07)
  bricks: Brick[]; // populated in M3 via ADD_BRICK action
};

// AppState — extends M2's shape with looseBricks (M3)
export type AppState = {
  blocks: Block[];
  categories: Category[];
  looseBricks: Brick[]; // M3 — bricks with parentBlockId === null
};

// Action — extends M4a's discriminated union with LOG_GOAL_BRICK (M4b)
export type Action =
  | { type: "ADD_BLOCK"; block: Block }
  | { type: "ADD_CATEGORY"; category: Category }
  | { type: "ADD_BRICK"; brick: Brick } // M3 — routed by brick.parentBlockId
  | { type: "LOG_TICK_BRICK"; brickId: string } // M4a — flips `done` on the brick with this id
  | { type: "LOG_GOAL_BRICK"; brickId: string; delta: 1 | -1 }; // M4b — clamp-increments goal brick count

export function assertNever(x: never): never {
  throw new Error(`unhandled ${JSON.stringify(x)}`);
}
