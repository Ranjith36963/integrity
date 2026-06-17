#!/usr/bin/env node
/**
 * scripts/check-tz-coverage.mjs — R7-ROOT-10 pre-commit TZ guard.
 *
 * Receives a list of staged file paths via argv (lint-staged convention)
 * or via stdin (fallback). For each `lib/*.ts` file that imports Date or
 * calls today()/new Date()/parseInt-on-date-string, verifies that EITHER
 *   (a) a sibling `*.tz.test.ts` exists, OR
 *   (b) the file itself is exempt (pure pixel math, no date dependency).
 *
 * The R2-P0-1 P0 (Jan 1 negative-UTC bug) was introduced by a R1 commit
 * that touched date logic WITHOUT adding a TZ-pinned test. This guard
 * prevents that pattern from happening again.
 *
 * Exempt list: files that legitimately have no TZ-sensitive date math.
 * EXEMPT must be tightly curated — over-exempting defeats the guard.
 *
 * Exit codes:
 *   0 — pass (no date-touching staged files, OR all have TZ tests, OR exempt)
 *   1 — fail (staged date-touching file has no TZ test and is not exempt)
 */
import { readFileSync, existsSync } from "node:fs";
import { dirname, basename, resolve } from "node:path";

// Files that touch Date but have no TZ semantics (pure unit/pixel math etc.).
const EXEMPT = new Set([
  "lib/timeOffset.ts", // pure pixel math, no Date dependency
  "lib/uuid.ts",
  "lib/types.ts",
  // Add new exemptions here with a one-line rationale in a comment.
]);

// R7-ROOT-10 transition baseline: files that ALREADY touch Date without a
// TZ-test sibling at the moment this guard was introduced. These pass with
// a WARNING, not a hard fail — so the guard ratchets in (new files must
// have coverage; old files get pressure but don't block the world).
//
// To shrink: add the *.tz.test.ts sibling, then remove the entry here.
const BASELINE = new Set([
  "lib/activeBlock.ts",
  "lib/celebrations.ts",
  "lib/currentDayBlocks.ts",
  "lib/data.ts",
  "lib/firstPaint.ts",
  "lib/haptics.ts",
  "lib/history.ts",
  "lib/monthGrid.ts",
  "lib/overlap.ts",
  "lib/persist.ts",
  "lib/reducedMotion.ts",
  "lib/snapToSlot.ts",
  "lib/usePersistedState.ts",
  "lib/useNow.ts",
  "lib/weekGrid.ts",
  "lib/yearGrid.ts",
  "lib/motion.ts",
  "lib/longPress.ts",
  "lib/persistSchemas.ts",
  "lib/dayOfYear.ts", // has dayOfYear.tz.test.ts; this list is conservative
  "lib/appliesOn.ts", // has appliesOn.tz.test.ts; this list is conservative
]);

// Date-touching signals. Any of these in the file body triggers the check.
const DATE_RE =
  /\b(?:new\s+Date|Date\s*\.\s*(?:now|parse|UTC)|today\s*\(|isoToLocalDate\s*\(|getFullYear|getMonth|getDate|getDay|getHours|getMinutes|getSeconds|setSystemTime|appliesOn\s*\(|rollover\s*\()/;

function fileTouchesDate(path) {
  try {
    const src = readFileSync(path, "utf-8");
    return DATE_RE.test(src);
  } catch {
    return false;
  }
}

function hasSiblingTzTest(path) {
  // For `lib/foo.ts`, the sibling is `lib/foo.tz.test.ts`. Search the same
  // directory for any *.tz.test.ts that imports from this file's basename.
  const dir = dirname(path);
  const base = basename(path, ".ts");
  // Conventional sibling name.
  const sibling = resolve(dir, `${base}.tz.test.ts`);
  if (existsSync(sibling)) return true;
  return false;
}

// Accept paths from argv OR from stdin (one per line).
async function getStagedFiles() {
  const args = process.argv.slice(2);
  if (args.length > 0) return args;
  if (process.stdin.isTTY) return [];
  // Read stdin.
  const chunks = [];
  for await (const chunk of process.stdin) chunks.push(chunk);
  return Buffer.concat(chunks)
    .toString("utf-8")
    .split("\n")
    .map((l) => l.trim())
    .filter(Boolean);
}

const staged = await getStagedFiles();

// Normalize to repo-relative POSIX paths.
const REPO_ROOT = resolve(new URL("..", import.meta.url).pathname);
function normalize(p) {
  const abs = resolve(p);
  return abs.startsWith(REPO_ROOT) ? abs.slice(REPO_ROOT.length + 1) : p;
}

const candidates = staged
  .map(normalize)
  .filter(
    (p) =>
      p.startsWith("lib/") &&
      p.endsWith(".ts") &&
      !p.endsWith(".test.ts") &&
      !p.endsWith(".d.ts"),
  );

if (candidates.length === 0) {
  // No staged lib files; nothing to check.
  process.exit(0);
}

const newOffenders = [];
const baselineOffenders = [];
for (const path of candidates) {
  if (EXEMPT.has(path)) continue;
  if (!fileTouchesDate(path)) continue;
  if (hasSiblingTzTest(path)) continue;
  if (BASELINE.has(path)) {
    baselineOffenders.push(path);
  } else {
    newOffenders.push(path);
  }
}

if (baselineOffenders.length > 0) {
  console.warn("");
  console.warn(
    "[pre-commit] R7-ROOT-10 baseline warning — these `lib/` file(s) lack a",
  );
  console.warn(
    "TZ-test sibling and are on the transition baseline. Please add one when",
  );
  console.warn("you can, and remove the entry from BASELINE in the script.");
  for (const o of baselineOffenders) {
    console.warn(`  - ${o}  (expected: ${o.replace(/\.ts$/, ".tz.test.ts")})`);
  }
}

if (newOffenders.length === 0) {
  process.exit(0);
}

console.error("");
console.error("[pre-commit] R7-ROOT-10 TZ-coverage guard tripped — HARD FAIL.");
console.error(
  "The following NEW staged `lib/` file(s) touch Date or today() but have no",
);
console.error(
  "sibling `*.tz.test.ts` file. The R2-P0-1 Jan-1 P0 came from this pattern.",
);
console.error("");
for (const o of newOffenders) {
  console.error(`  - ${o}`);
  console.error(`    expected: ${o.replace(/\.ts$/, ".tz.test.ts")}`);
}
console.error("");
console.error(
  "Either: (a) add the TZ test (see lib/dharma.tz.test.ts for the shape), or",
);
console.error(
  "        (b) if the file legitimately has no TZ semantics, add it to EXEMPT",
);
console.error("            in scripts/check-tz-coverage.mjs with a rationale.");
process.exit(1);
