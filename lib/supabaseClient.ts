/**
 * lib/supabaseClient.ts — M11 Step 4: lazy browser Supabase client.
 *
 * Created on first use, client-side only (SSR gets null). Persists the session
 * in localStorage and auto-detects the magic-link token in the URL on return.
 * Any failure to construct → null, and every caller treats null as "cloud off"
 * so the app runs on localStorage exactly as before.
 */
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import {
  SUPABASE_URL,
  SUPABASE_ANON_KEY,
  isSupabaseConfigured,
} from "./supabaseConfig";

let cached: SupabaseClient | null | undefined;

export function getSupabase(): SupabaseClient | null {
  if (cached !== undefined) return cached;
  if (typeof window === "undefined" || !isSupabaseConfigured()) {
    cached = null;
    return cached;
  }
  try {
    cached = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
      auth: {
        persistSession: true,
        autoRefreshToken: true,
        detectSessionInUrl: true,
        flowType: "pkce",
      },
    });
  } catch {
    cached = null;
  }
  return cached;
}
