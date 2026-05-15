// scoring.ts — re-exports the canonical scoring helpers from dharma.ts.
// M3: dayPct signature changed to dayPct(state: AppState) per plan.md § Data models.
// buildingPct alias follows the same signature.
export { brickPct, blockPct, dayPct } from "./dharma";

// buildingPct is an alias for dayPct.
export { dayPct as buildingPct } from "./dharma";
