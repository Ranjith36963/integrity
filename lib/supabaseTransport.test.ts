/**
 * lib/supabaseTransport.test.ts — M11 Step 4: Supabase adapter over a mock client.
 *
 * Verifies the adapter maps to the right table/columns, migrates remote state,
 * treats an empty row as "no remote", surfaces errors, and upserts on user_id.
 * (The live network is exercised by the user in the browser — this sandbox is
 * policy-blocked from Supabase.)
 */
import { describe, it, expect, vi } from "vitest";
import { makeSupabaseTransport } from "./supabaseTransport";
import type { PersistedState } from "./persist";
import type { SupabaseClient } from "@supabase/supabase-js";

const sample: PersistedState = {
  schemaVersion: 3,
  programStart: "2026-06-01",
  currentDate: "2026-06-01",
  history: {},
  blocks: [],
  categories: [],
  looseBricks: [],
  deletions: {},
};

function pullClient(
  row: { state: unknown; updated_at: string } | null,
  error?: string,
) {
  const maybeSingle = vi.fn(async () => ({
    data: row,
    error: error ? { message: error } : null,
  }));
  const eq = vi.fn(() => ({ maybeSingle }));
  const select = vi.fn(() => ({ eq }));
  const from = vi.fn(() => ({ select }));
  return { client: { from } as unknown as SupabaseClient, from, select, eq };
}

describe("makeSupabaseTransport.pull", () => {
  it("returns null when the row is missing", async () => {
    const { client } = pullClient(null);
    const t = makeSupabaseTransport(client, "user-1");
    expect(await t.pull()).toBeNull();
  });

  it("returns migrated state + updatedAt when the row exists", async () => {
    const { client, from, eq } = pullClient({
      state: sample,
      updated_at: "2026-07-02T10:00:00Z",
    });
    const t = makeSupabaseTransport(client, "user-1");
    const snap = await t.pull();
    expect(snap?.updatedAt).toBe("2026-07-02T10:00:00Z");
    expect(snap?.state.programStart).toBe("2026-06-01");
    expect(from).toHaveBeenCalledWith("dharma_state");
    expect(eq).toHaveBeenCalledWith("user_id", "user-1");
  });

  it("throws on a query error (caller treats a throw as no-op)", async () => {
    const { client } = pullClient(null, "boom");
    const t = makeSupabaseTransport(client, "user-1");
    await expect(t.pull()).rejects.toThrow(/boom/);
  });
});

describe("makeSupabaseTransport.push", () => {
  it("upserts {user_id, state, updated_at} on user_id conflict", async () => {
    const upsert = vi.fn(async () => ({ error: null }));
    const client = {
      from: vi.fn(() => ({ upsert })),
    } as unknown as SupabaseClient;
    const t = makeSupabaseTransport(client, "user-9");
    await t.push(sample, "2026-07-02T12:00:00Z");
    expect(upsert).toHaveBeenCalledWith(
      { user_id: "user-9", state: sample, updated_at: "2026-07-02T12:00:00Z" },
      { onConflict: "user_id" },
    );
  });

  it("throws when upsert errors", async () => {
    const upsert = vi.fn(async () => ({ error: { message: "denied" } }));
    const client = {
      from: vi.fn(() => ({ upsert })),
    } as unknown as SupabaseClient;
    const t = makeSupabaseTransport(client, "user-9");
    await expect(t.push(sample, "t")).rejects.toThrow(/denied/);
  });
});
