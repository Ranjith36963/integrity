/**
 * lib/supabaseConfig.ts — M11 Step 4: Supabase connection config.
 *
 * These two values are PUBLIC by design: the anon key only ever grants what the
 * database's row-level-security policies allow (each signed-in user can touch
 * ONLY their own `dharma_state` row). `NEXT_PUBLIC_*` env vars are baked into the
 * client bundle anyway, so committing them here is equivalent — and lets the
 * app work without any Vercel dashboard setup. An env var, if present, wins
 * (so you can point a fork at a different project without editing code).
 *
 * The secret/service key is NEVER referenced anywhere in this app.
 */
export const SUPABASE_URL =
  process.env.NEXT_PUBLIC_SUPABASE_URL ??
  "https://cjjrlkymasczmavpwxpa.supabase.co";

export const SUPABASE_ANON_KEY =
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ??
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImNqanJsa3ltYXNjem1hdnB3eHBhIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODI5OTg4NTksImV4cCI6MjA5ODU3NDg1OX0.n9sHoR2Lvpl6TXJmZNrNsoGUwiPuVgMojttRx3zef5c";

/** Where the magic-link email sends the user back to after they tap it. */
export const SUPABASE_REDIRECT_URL = "https://integrity-pink.vercel.app";

/** Row/table the whole app state is mirrored into (one row per user). */
export const DHARMA_STATE_TABLE = "dharma_state";

export function isSupabaseConfigured(): boolean {
  return SUPABASE_URL.length > 0 && SUPABASE_ANON_KEY.length > 0;
}
