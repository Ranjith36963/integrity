/**
 * app/sw.test.ts — structural guard for the offline service worker (public/sw.js).
 *
 * The service worker runs in a Worker global that jsdom can't execute, so we
 * assert on its source: it must wire the three lifecycle handlers, take control
 * immediately (skipWaiting + clients.claim), carry a bumpable cache version, and
 * handle navigations so the app launches offline. These are the properties that
 * silently break offline support if a refactor drops one.
 */
import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";

const src = readFileSync(join(process.cwd(), "public/sw.js"), "utf-8");

describe("service worker (public/sw.js)", () => {
  it("registers install, activate, and fetch handlers", () => {
    expect(src).toMatch(/addEventListener\(\s*["']install["']/);
    expect(src).toMatch(/addEventListener\(\s*["']activate["']/);
    expect(src).toMatch(/addEventListener\(\s*["']fetch["']/);
  });

  it("takes control immediately (skipWaiting + clients.claim)", () => {
    expect(src).toMatch(/skipWaiting\(\)/);
    expect(src).toMatch(/clients\.claim\(\)/);
  });

  it("carries a bumpable cache version and purges old caches on activate", () => {
    expect(src).toMatch(/CACHE_VERSION\s*=\s*["']dharma-v\d+["']/);
    expect(src).toMatch(/caches\.delete/);
  });

  it("serves navigations offline (falls back to cache / app shell)", () => {
    expect(src).toMatch(/request\.mode\s*===\s*["']navigate["']/);
    expect(src).toMatch(/caches\.match/);
  });

  it("only handles GET and skips cross-origin requests", () => {
    expect(src).toMatch(/request\.method\s*!==\s*["']GET["']/);
    expect(src).toMatch(/url\.origin\s*!==\s*self\.location\.origin/);
  });
});
