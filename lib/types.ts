export type Category = "health" | "mind" | "career" | "passive";

export type Brick =
  | { kind: "tick"; name: string; done: boolean }
  | { kind: "goal"; name: string; current: number; target: number; unit?: string }
  | { kind: "time"; name: string; current: number; target: number };

export interface Block {
  start: string;
  end: string;
  name: string;
  category: Category;
  bricks: Brick[];
}

export const CATEGORY_COLOR: Record<Category, string> = {
  health: "#34d399",
  mind: "#c4b5fd",
  career: "#fbbf24",
  passive: "#64748b",
};

export const CATEGORY_LABEL: Record<Category, string> = {
  health: "Health",
  mind: "Mind",
  career: "Career",
  passive: "Passive",
};
