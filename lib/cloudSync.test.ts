/**
 * lib/cloudSync.test.ts — M11 Step 4: the sync/merge engine (last-write-wins).
 *
 * These prove the data-safety heart of cloud backup independent of any backend:
 * the phone never silently clobbers a newer cloud copy, and the cloud never
 * clobbers newer local edits.
 */
import { describe, it, expect, vi } from "vitest";
import { decideSync, syncOnce, type SyncTransport } from "./cloudSync";
import { defaultState } from "./data";
import type { PersistedState } from "./persist";

const local = {
  ...(defaultState() as unknown as PersistedState),
  programStart: "L",
};
const remoteState = {
  ...(defaultState() as unknown as PersistedState),
  programStart: "R",
};

describe("decideSync — last-write-wins", () => {
  it("first sync (no remote) → push", () => {
    expect(decideSync("2026-07-02T10:00:00Z", null).action).toBe("push");
  });
  it("no local timestamp → pull remote (adopt the cloud)", () => {
    const d = decideSync(null, {
      state: remoteState,
      updatedAt: "2026-07-02T10:00:00Z",
    });
    expect(d.action).toBe("pull");
    if (d.action === "pull") expect(d.state.programStart).toBe("R");
  });
  it("local newer → push", () => {
    const d = decideSync("2026-07-02T12:00:00Z", {
      state: remoteState,
      updatedAt: "2026-07-02T10:00:00Z",
    });
    expect(d.action).toBe("push");
  });
  it("remote newer → pull", () => {
    const d = decideSync("2026-07-02T09:00:00Z", {
      state: remoteState,
      updatedAt: "2026-07-02T10:00:00Z",
    });
    expect(d.action).toBe("pull");
  });
  it("equal timestamps → noop", () => {
    const d = decideSync("2026-07-02T10:00:00Z", {
      state: remoteState,
      updatedAt: "2026-07-02T10:00:00Z",
    });
    expect(d.action).toBe("noop");
  });
});

describe("syncOnce — orchestration against a mock transport", () => {
  it("pushes local + stamps now when there is no remote yet", async () => {
    const push = vi.fn(() => Promise.resolve());
    const transport: SyncTransport = {
      pull: () => Promise.resolve(null),
      push,
    };
    const { decision, state } = await syncOnce(
      local,
      "2026-07-02T10:00:00Z",
      "2026-07-02T10:00:00Z",
      transport,
    );
    expect(decision.action).toBe("push");
    expect(push).toHaveBeenCalledWith(local, "2026-07-02T10:00:00Z");
    expect(state.programStart).toBe("L");
  });

  it("adopts the remote state when the cloud copy is newer (fresh device)", async () => {
    const push = vi.fn(() => Promise.resolve());
    const transport: SyncTransport = {
      pull: () =>
        Promise.resolve({
          state: remoteState,
          updatedAt: "2026-07-02T12:00:00Z",
        }),
      push,
    };
    const { decision, state } = await syncOnce(
      local,
      "2026-07-02T09:00:00Z",
      "2026-07-02T13:00:00Z",
      transport,
    );
    expect(decision.action).toBe("pull");
    expect(state.programStart).toBe("R"); // logging in on a new phone gets your data
    expect(push).not.toHaveBeenCalled(); // must NOT clobber the newer cloud copy
  });

  it("does nothing when already in sync", async () => {
    const push = vi.fn(() => Promise.resolve());
    const transport: SyncTransport = {
      pull: () =>
        Promise.resolve({
          state: remoteState,
          updatedAt: "2026-07-02T10:00:00Z",
        }),
      push,
    };
    const { decision } = await syncOnce(
      local,
      "2026-07-02T10:00:00Z",
      "2026-07-02T11:00:00Z",
      transport,
    );
    expect(decision.action).toBe("noop");
    expect(push).not.toHaveBeenCalled();
  });
});
