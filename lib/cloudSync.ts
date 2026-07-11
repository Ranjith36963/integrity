/**
 * lib/cloudSync.ts — M11 Step 4: backend-agnostic sync engine.
 *
 * The correctness-critical part of cloud backup is deciding, on each reconnect,
 * whether the phone or the cloud copy wins — get that wrong and you lose data.
 * That decision is pure and testable here; the actual network is a thin
 * `SyncTransport` adapter (a Supabase implementation is ~30 lines and needs the
 * user's project URL + anon key — see docs/milestones/m11/spec.md Step 4).
 *
 * Policy: last-write-wins by an ISO timestamp (`updatedAt`), matching DEC-1's
 * spirit — the most recent truth wins. For a single-user app across their own
 * devices this is correct and simple; per-field merge is a future refinement.
 *
 * Pure: never reads the clock (callers pass `now`), never touches storage.
 */
import type { PersistedState } from "./persist";

export type RemoteSnapshot = { state: PersistedState; updatedAt: string };

export type SyncDecision =
  | { action: "push"; reason: string }
  | { action: "pull"; state: PersistedState; reason: string }
  | { action: "noop"; reason: string };

/**
 * Decide the sync action from the local change time and the remote snapshot.
 * ISO-8601 timestamps compare lexicographically == chronologically.
 */
export function decideSync(
  localUpdatedAt: string | null,
  remote: RemoteSnapshot | null,
): SyncDecision {
  if (!remote) return { action: "push", reason: "no remote copy yet" };
  if (!localUpdatedAt) {
    return {
      action: "pull",
      state: remote.state,
      reason: "no local timestamp",
    };
  }
  if (localUpdatedAt > remote.updatedAt) {
    return { action: "push", reason: "local is newer" };
  }
  if (localUpdatedAt < remote.updatedAt) {
    return { action: "pull", state: remote.state, reason: "remote is newer" };
  }
  return { action: "noop", reason: "already in sync" };
}

/** Network seam. A Supabase adapter implements this against one `dharma_state`
 *  row per authenticated user (jsonb `state` + `updated_at`). */
export interface SyncTransport {
  pull(): Promise<RemoteSnapshot | null>;
  push(state: PersistedState, updatedAt: string): Promise<void>;
}

/**
 * Run one sync pass: pull remote, decide, then push (local newer / first sync)
 * or return the remote state to adopt (remote newer). `now` is the timestamp to
 * stamp a push with — supplied by the caller, never read from the clock here.
 * `remote` is returned so the caller can compare content on a noop (equal
 * timestamps do NOT guarantee equal content — e.g. edits made while signed out
 * never advanced the local timestamp).
 */
export async function syncOnce(
  local: PersistedState,
  localUpdatedAt: string | null,
  now: string,
  transport: SyncTransport,
): Promise<{
  decision: SyncDecision;
  state: PersistedState;
  remote: RemoteSnapshot | null;
}> {
  const remote = await transport.pull();
  const decision = decideSync(localUpdatedAt, remote);
  if (decision.action === "push") {
    await transport.push(local, now);
    return { decision, state: local, remote };
  }
  if (decision.action === "pull") {
    return { decision, state: decision.state, remote };
  }
  return { decision, state: local, remote };
}
