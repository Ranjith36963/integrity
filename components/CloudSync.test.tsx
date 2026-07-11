/**
 * components/CloudSync.test.tsx — M11 sync-audit invariants.
 *
 * These pin the three data-safety rules of the background sync:
 *  1. No push fires before the initial reconcile completes (a stale device must
 *     never upsert over a newer cloud copy while the first pull is in flight —
 *     visibilitychange fires mid-sign-in when the user switches to their email).
 *  2. A "noop" verdict with mismatched content (signed-out edits never advance
 *     the timestamp) still pushes on the next tick — edits are never stranded.
 *  3. Local data from a newer app version freezes sync — nothing pulled, pushed,
 *     or overwritten.
 */
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, cleanup } from "@testing-library/react";
import { CloudSync } from "./CloudSync";
import { migrate, STORAGE_KEY } from "@/lib/persist";
import type { PersistedState } from "@/lib/persist";

const TS_KEY = `${STORAGE_KEY}:updatedAt`;

const pull = vi.fn<() => Promise<unknown>>();
const push = vi.fn<() => Promise<void>>();

vi.mock("@/lib/supabaseClient", () => ({
  getSupabase: () => ({
    auth: {
      getSession: () =>
        Promise.resolve({ data: { session: { user: { id: "user-1" } } } }),
      onAuthStateChange: () => ({
        data: { subscription: { unsubscribe: vi.fn() } },
      }),
    },
  }),
}));

vi.mock("@/lib/supabaseTransport", () => ({
  makeSupabaseTransport: () => ({ pull, push }),
}));

const rawV3 = (programStart: string) =>
  JSON.stringify({
    schemaVersion: 3,
    programStart,
    currentDate: programStart,
    history: {},
    blocks: [],
    categories: [],
    looseBricks: [],
    deletions: {},
  });

/** Canonical (post-migrate) state, as the transport would return it. */
const canonical = (programStart: string): PersistedState =>
  migrate(JSON.parse(rawV3(programStart)))!;

describe("CloudSync data-safety invariants", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    localStorage.clear();
    pull.mockReset();
    push.mockReset();
    push.mockResolvedValue(undefined);
  });
  afterEach(() => {
    cleanup();
    vi.useRealTimers();
  });

  it("never pushes while the initial reconcile is still in flight (interval + visibilitychange gated)", async () => {
    localStorage.setItem(STORAGE_KEY, rawV3("2026-06-01"));
    localStorage.setItem(TS_KEY, "2026-07-01T00:00:00.000Z");

    let resolvePull!: (v: unknown) => void;
    pull.mockReturnValue(new Promise((r) => (resolvePull = r)));

    render(<CloudSync />);
    await vi.advanceTimersByTimeAsync(0); // getSession resolves; pull starts (pending)
    expect(pull).toHaveBeenCalledTimes(1);

    // Mid-sign-in reality: user switches to their email app → visibilitychange.
    document.dispatchEvent(new Event("visibilitychange"));
    await vi.advanceTimersByTimeAsync(13000); // two interval ticks too
    expect(push).not.toHaveBeenCalled(); // ← the invariant

    // Reconcile finishes (no remote yet) → the ONE sanctioned push happens.
    resolvePull(null);
    await vi.advanceTimersByTimeAsync(0);
    expect(push).toHaveBeenCalledTimes(1);
  });

  it("pushes stranded signed-out edits: equal timestamps but different content is NOT 'in sync'", async () => {
    // Local was edited while signed out → content differs, timestamp stale.
    localStorage.setItem(STORAGE_KEY, rawV3("2026-06-15"));
    localStorage.setItem(TS_KEY, "2026-07-01T00:00:00.000Z");
    pull.mockResolvedValue({
      state: canonical("2026-06-01"), // cloud still has the pre-edit copy
      updatedAt: "2026-07-01T00:00:00.000Z", // same stamp → decideSync says noop
    });

    render(<CloudSync />);
    await vi.advanceTimersByTimeAsync(0); // initial reconcile: noop, content mismatch
    expect(push).not.toHaveBeenCalled();

    await vi.advanceTimersByTimeAsync(6000); // next tick must upload the edits
    expect(push).toHaveBeenCalledTimes(1);
    const [pushedState] = push.mock.calls[0] as unknown as [PersistedState];
    expect(pushedState.programStart).toBe("2026-06-15");
  });

  it("a true noop (equal timestamps AND equal content) never re-pushes", async () => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(canonical("2026-06-01")));
    localStorage.setItem(TS_KEY, "2026-07-01T00:00:00.000Z");
    pull.mockResolvedValue({
      state: canonical("2026-06-01"),
      updatedAt: "2026-07-01T00:00:00.000Z",
    });

    render(<CloudSync />);
    await vi.advanceTimersByTimeAsync(20000);
    expect(push).not.toHaveBeenCalled();
  });

  it("freezes entirely when local data is from a newer app version: no pull, no push, no overwrite", async () => {
    const futureRaw = JSON.stringify({ schemaVersion: 99, cool: "new stuff" });
    localStorage.setItem(STORAGE_KEY, futureRaw);
    localStorage.setItem(TS_KEY, "2026-07-01T00:00:00.000Z");

    render(<CloudSync />);
    await vi.advanceTimersByTimeAsync(20000);
    expect(pull).not.toHaveBeenCalled();
    expect(push).not.toHaveBeenCalled();
    expect(localStorage.getItem(STORAGE_KEY)).toBe(futureRaw); // untouched
  });
});
