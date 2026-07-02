"use client";
/**
 * lib/useSupabaseSession.ts — M11 Step 4: auth state + magic-link sign in/out.
 *
 * Safe when cloud is off: `configured` is false and the actions no-op, so any
 * consumer can render an "off" state without special-casing. Reads only the
 * session — the actual data sync lives in components/CloudSync.tsx.
 */
import { useEffect, useState, useCallback } from "react";
import { getSupabase } from "./supabaseClient";
import { SUPABASE_REDIRECT_URL } from "./supabaseConfig";

export type SyncAuth = {
  ready: boolean;
  email: string | null;
  configured: boolean;
  signInWithEmail: (email: string) => Promise<{ ok: boolean; error?: string }>;
  signOut: () => Promise<void>;
};

export function useSupabaseSession(): SyncAuth {
  const [email, setEmail] = useState<string | null>(null);
  const [ready, setReady] = useState(false);
  const supabase = getSupabase();

  useEffect(() => {
    if (!supabase) {
      // eslint-disable-next-line react-hooks/set-state-in-effect -- one-shot "cloud off" flag; no re-render loop
      setReady(true);
      return;
    }
    let active = true;
    supabase.auth.getSession().then(({ data }) => {
      if (!active) return;
      setEmail(data.session?.user?.email ?? null);
      setReady(true);
    });
    const { data: sub } = supabase.auth.onAuthStateChange((_event, session) => {
      setEmail(session?.user?.email ?? null);
    });
    return () => {
      active = false;
      sub.subscription.unsubscribe();
    };
  }, [supabase]);

  const signInWithEmail = useCallback(
    async (addr: string) => {
      if (!supabase)
        return { ok: false, error: "Cloud sync isn't configured." };
      const { error } = await supabase.auth.signInWithOtp({
        email: addr.trim(),
        options: { emailRedirectTo: SUPABASE_REDIRECT_URL },
      });
      return error ? { ok: false, error: error.message } : { ok: true };
    },
    [supabase],
  );

  const signOut = useCallback(async () => {
    if (supabase) await supabase.auth.signOut();
  }, [supabase]);

  return { ready, email, configured: !!supabase, signInWithEmail, signOut };
}
