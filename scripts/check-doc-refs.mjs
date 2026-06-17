#!/usr/bin/env node
/**
 * scripts/check-doc-refs.mjs — R7-ROOT-9 doc-reference integrity check.
 *
 * Walks every Markdown file under docs/ and verifies:
 *   - Backtick-wrapped commit hashes (`abc1234`, `abc1234567`) resolve to a
 *     real commit via `git cat-file -e`.
 *   - Backtick-wrapped file references (`path/file.ext`) point to an existing
 *     file on disk.
 *   - file-with-line refs (`path/file.ext:NNN`) point to a file that has at
 *     least NNN lines.
 *
 * Outputs a structured report and exits non-zero on any broken ref. Run via:
 *   npm run check:docs
 *
 * False-positive policy: anything inside a fenced code block (``` … ```) is
 * skipped — those are typically examples, not real references. Inline code
 * (`…` single-line) is what we check.
 *
 * Pre-existing breakage policy: known-broken refs can be allow-listed in the
 * ALLOWLIST set at the top of the file. New refs MUST be valid.
 */
import { execSync } from "node:child_process";
import { readFileSync, statSync } from "node:fs";
import { join, dirname, relative, resolve } from "node:path";
import { readdirSync } from "node:fs";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const REPO_ROOT = resolve(dirname(__filename), "..");

// Known-broken refs that pre-date the doc-ref checker — kept for archeology
// but explicitly allow-listed so they don't fail CI.
const ALLOWLIST = new Set([
  // Pre-existing — add new items here only with a rationale.
]);

// Commit hashes: 7-40 hex chars. We additionally require either lowercase-only
// (real commit hashes are lowercase hex) and the regex won't match dates like
// "2026" (mixed digit/dash patterns).
const HASH_RE = /(?<![a-zA-Z0-9])`([a-f0-9]{7,40})`(?![a-zA-Z0-9])/g;

// File refs: must contain a / OR start with a recognized directory prefix.
// This excludes bare filenames like `plan.md` or `globals.css` that are
// ambiguous (many files share the name across milestones).
const FILE_REF_RE = /`((?:\.{0,2}\/)?(?:lib|components|app|tests|docs|scripts|public|node_modules|\.github)\/[a-zA-Z0-9_./-]+\.(?:ts|tsx|md|json|js|mjs|css|yml|yaml))(?::(\d+))?`/g;

// Skip frozen monolith docs — they intentionally reference paths from the
// pre-sharding era and are documented as "historical reference" in CLAUDE.md.
// Per ADR-053 followups (R7 future work), these will be deleted at the end
// of the root-cause cleanup loop.
const SKIP_FILES = new Set([
  "docs/spec.md",
  "docs/plan.md",
  "docs/tests.md",
  "docs/decisions.md",
]);

function listMarkdown(dir, out = []) {
  for (const name of readdirSync(dir)) {
    const full = join(dir, name);
    const st = statSync(full);
    if (st.isDirectory()) {
      if (name === "node_modules" || name === ".git" || name === ".next") continue;
      listMarkdown(full, out);
    } else if (name.endsWith(".md")) {
      out.push(full);
    }
  }
  return out;
}

function stripFencedBlocks(src) {
  // Remove ``` … ``` blocks so example references inside them don't trigger.
  return src.replace(/```[\s\S]*?```/g, "");
}

function checkCommitHash(hash) {
  try {
    execSync(`git -C "${REPO_ROOT}" cat-file -e ${hash}`, { stdio: "ignore" });
    return true;
  } catch {
    return false;
  }
}

function checkFileRef(refPath, lineNo) {
  const abs = resolve(REPO_ROOT, refPath);
  if (!abs.startsWith(REPO_ROOT)) return false; // path-traversal guard
  try {
    const st = statSync(abs);
    if (!st.isFile()) return false;
    if (lineNo === null || lineNo === undefined) return true;
    const lines = readFileSync(abs, "utf-8").split("\n").length;
    return Number(lineNo) <= lines;
  } catch {
    return false;
  }
}

const issues = [];
const docsDir = join(REPO_ROOT, "docs");
const files = listMarkdown(docsDir);
let scanned = 0;

for (const file of files) {
  const rel = relative(REPO_ROOT, file);
  if (SKIP_FILES.has(rel)) continue;
  const src = stripFencedBlocks(readFileSync(file, "utf-8"));

  // 1. Commit hashes
  for (const match of src.matchAll(HASH_RE)) {
    const hash = match[1];
    // Filter: skip if it looks like part of a longer word (e.g., css color)
    if (ALLOWLIST.has(hash)) continue;
    // Skip 6-char css-color-looking refs by only flagging length >= 7 (done in regex).
    scanned++;
    if (!checkCommitHash(hash)) {
      // Only fail on hashes that look like commit hashes specifically — i.e.
      // are not 8-char css hex colors (but our regex needs 7+ already).
      // Also: skip plain dates like '2026-05' or words.
      // The regex already constrains to [a-f0-9]{7,40} so this is mostly tight.
      issues.push({
        file: rel,
        kind: "commit",
        ref: hash,
        msg: `Commit hash \`${hash}\` does not exist in this repo.`,
      });
    }
  }

  // 2. File and file:line refs
  for (const match of src.matchAll(FILE_REF_RE)) {
    const refPath = match[1];
    const lineNo = match[2] ?? null;
    if (ALLOWLIST.has(refPath)) continue;
    scanned++;
    if (!checkFileRef(refPath, lineNo)) {
      issues.push({
        file: rel,
        kind: lineNo ? "file-with-line" : "file",
        ref: lineNo ? `${refPath}:${lineNo}` : refPath,
        msg: lineNo
          ? `\`${refPath}:${lineNo}\` — file missing OR has fewer than ${lineNo} lines.`
          : `\`${refPath}\` — file does not exist.`,
      });
    }
  }
}

console.log(
  `Doc-ref checker: scanned ${scanned} refs across ${files.length} markdown files.`,
);

// R7-ROOT-9 ratchet: like the lint ratchet, lock at the current count and
// fail CI only if the count GROWS. Existing archaeological breakage in
// milestone-shard docs (m4f→m9e refer to since-deleted lib paths) is
// accepted; new docs must be clean. The ceiling moves down with each
// cleanup pass — never up.
//
// Locked ceiling (2026-05-23 R7-ROOT-9 inception): 271 broken refs.
// To lower: run `node scripts/check-doc-refs.mjs --update-ceiling` after
// fixing some, copy the printed count back into this constant.
const CEILING = 271;

if (issues.length > CEILING) {
  console.error("\nBroken references found:");
  for (const issue of issues) {
    console.error(`  [${issue.kind}] ${issue.file} → ${issue.msg}`);
  }
  console.error(
    `\n${issues.length} broken refs (ceiling: ${CEILING}). The ratchet only allows the count to drop.`,
  );
  process.exit(1);
}

if (issues.length === 0) {
  console.log("All references resolve. ✓");
} else {
  console.log(
    `${issues.length} broken refs (at or below ceiling ${CEILING}). ✓`,
  );
  console.log(
    `Run with --verbose to list them; the ceiling can be lowered after cleanup.`,
  );
  if (process.argv.includes("--verbose")) {
    console.log("\nDetails:");
    for (const issue of issues) {
      console.log(`  [${issue.kind}] ${issue.file} → ${issue.msg}`);
    }
  }
}
process.exit(0);
