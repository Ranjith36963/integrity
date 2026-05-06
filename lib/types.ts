// lib/types.ts — re-authored for M2 (plan.md § Data model).
// DELETED: type Category = "health" | "mind" | "career" | "passive"
// DELETED: CATEGORY_COLOR, CATEGORY_LABEL (all four exports)
// ADDED: Recurrence union (ADR-019), Category object (ADR-032), widened Block, AppState, Action, assertNever

export type Brick =
  | { kind: "tick"; name: string; done: boolean }
  | {
      kind: "goal";
      name: string;
      current: number;
      target: number;
      unit?: string;
    }
  | { kind: "time"; name: string; current: number; target: number };

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
  bricks: Brick[]; // always [] in M2; M3 lands brick adding
};

export type AppState = { blocks: Block[]; categories: Category[] };

export type Action =
  | { type: "ADD_BLOCK"; block: Block }
  | { type: "ADD_CATEGORY"; category: Category };

export function assertNever(x: never): never {
  throw new Error(`unhandled ${JSON.stringify(x)}`);
}
