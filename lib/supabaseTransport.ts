/**
 * lib/supabaseTransport.ts — M11 Step 4: SyncTransport backed by Supabase.
 *
 * Reads/writes the caller's single `dharma_state` row. Row-level security scopes
 * every query to the authenticated user, so there is no way to see or clobber
 * anyone else's data. Remote state is re-run through migrate() so an older cloud
 * copy is upgraded on the way in. Any error surfaces to the caller (which treats
 * a failed sync as a no-op — localStorage stays the source of truth).
 */
import type { SupabaseClient } from "@supabase/supabase-js";
import type { SyncTransport, RemoteSnapshot } from "./cloudSync";
import type { PersistedState } from "./persist";
import { migrate } from "./persist";
import { DHARMA_STATE_TABLE } from "./supabaseConfig";

export function makeSupabaseTransport(
  client: SupabaseClient,
  userId: string,
): SyncTransport {
  return {
    async pull(): Promise<RemoteSnapshot | null> {
      const { data, error } = await client
        .from(DHARMA_STATE_TABLE)
        .select("state, updated_at")
        .eq("user_id", userId)
        .maybeSingle();
      if (error) throw new Error(error.message);
      if (!data || data.state == null) return null;
      const state = migrate(data.state);
      if (!state) return null; // unrecognizable remote → treat as no remote
      return { state, updatedAt: data.updated_at as string };
    },

    async push(state: PersistedState, updatedAt: string): Promise<void> {
      const { error } = await client
        .from(DHARMA_STATE_TABLE)
        .upsert(
          { user_id: userId, state, updated_at: updatedAt },
          { onConflict: "user_id" },
        );
      if (error) throw new Error(error.message);
    },
  };
}
