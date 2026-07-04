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

export type SyncAuth = {
  ready: boolean;
  email: string | null;
  configured: boolean;
  signInWithEmail: (email: string) => Promise<{ ok: boolean; error?: string }>;
  verifyCode: (
    email: string,
    code: string,
  ) => Promise<{ ok: boolean; error?: string }>;
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

  // Send a 6-digit code (NOT a magic link). A code is typed back into this same
  // browser, so the session is created where the app actually lives — unlike a
  // magic link, which opens in Gmail's browser / a fresh tab and strands the
  // session in the wrong storage box (the mobile PWA sign-in trap). No
  // emailRedirectTo → Supabase emails the {{ .Token }} code, not a link.
  const signInWithEmail = useCallback(
    async (addr: string) => {
      if (!supabase)
        return { ok: false, error: "Cloud sync isn't configured." };
      const { error } = await supabase.auth.signInWithOtp({
        email: addr.trim(),
        options: { shouldCreateUser: true },
      });
      return error ? { ok: false, error: error.message } : { ok: true };
    },
    [supabase],
  );

  // Exchange the emailed code for a session — right here, in the app's browser.
  // On success, onAuthStateChange fires SIGNED_IN and `email` populates.
  const verifyCode = useCallback(
    async (addr: string, code: string) => {
      if (!supabase)
        return { ok: false, error: "Cloud sync isn't configured." };
      const { error } = await supabase.auth.verifyOtp({
        email: addr.trim(),
        token: code.trim(),
        type: "email",
      });
      return error ? { ok: false, error: error.message } : { ok: true };
    },
    [supabase],
  );

  const signOut = useCallback(async () => {
    if (supabase) await supabase.auth.signOut();
  }, [supabase]);

  return {
    ready,
    email,
    configured: !!supabase,
    signInWithEmail,
    verifyCode,
    signOut,
  };
}
