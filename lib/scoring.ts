// scoring.ts — re-exports the canonical scoring helpers from dharma.ts.
// dayPct (aliased as buildingPct) uses equal-weighted average of blockPct
// per spec §Scoring: "All equal weight" (fixed in SG-bld-08).
export { brickPct, blockPct, dayPct } from "./dharma";

// buildingPct is an alias for dayPct.
export { dayPct as buildingPct } from "./dharma";
