"use client";
/**
 * lib/useSupabaseSession.ts — M11 Step 4: auth state + email/password sign in/out.
 *
 * Password auth, deliberately: every email-dependent flow failed in the field —
 * magic links open in the wrong browser (Gmail's in-app browser / a fresh tab /
 * an iOS home-screen PWA has its own storage), OTP codes need a paid-gated email
 * template edit, and the built-in sender is rate-limited project-wide. A password
 * typed in the app touches no email at all: same browser, session sticks, free.
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
  /** Sign in; if the account doesn't exist yet, create it (first sign-in IS
   *  sign-up). Resolves ok when a live session exists. */
  signInOrSignUp: (
    email: string,
    password: string,
  ) => Promise<{ ok: boolean; error?: string }>;
  /** Secondary path: email a magic sign-in link. Works when the link opens in
   *  the same browser the app runs in (implicit flow carries the session in
   *  the URL); the mobile in-app-browser trap is why password is primary. */
  signInWithMagicLink: (
    email: string,
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

  // Try sign-in; on "no such account" create it. Everything happens in the
  // app's own browser — no email round-trip, so the session always sticks.
  const signInOrSignUp = useCallback(
    async (addr: string, password: string) => {
      if (!supabase)
        return { ok: false, error: "Cloud sync isn't configured." };
      const em = addr.trim();
      const { error } = await supabase.auth.signInWithPassword({
        email: em,
        password,
      });
      // "Failed to fetch" is browser jargon — translate the offline case.
      if (error && /fetch|network/i.test(error.message)) {
        return {
          ok: false,
          error:
            "Couldn't reach the cloud — check your connection and try again.",
        };
      }
      if (!error) return { ok: true };
      if (!/invalid login credentials/i.test(error.message)) {
        return { ok: false, error: error.message };
      }
      // Unknown account OR wrong password — Supabase deliberately doesn't say
      // which. Attempt sign-up: a genuinely new account signs straight in.
      const { data, error: e2 } = await supabase.auth.signUp({
        email: em,
        password,
      });
      if (e2) return { ok: false, error: e2.message };
      if (data.session) return { ok: true };
      // No session back: either the project requires email confirmation for a
      // new account, or the account already existed (wrong password).
      return {
        ok: false,
        error:
          "Wrong password — or, if you're new here, check your email to confirm the account, then sign in again.",
      };
    },
    [supabase],
  );

  // Secondary path: the emailed sign-in link. Kept alongside password (per
  // user request) — it works when the link opens in the browser the app lives
  // in; the implicit flow (supabaseClient) carries the session in the URL.
  const signInWithMagicLink = useCallback(
    async (addr: string) => {
      if (!supabase)
        return { ok: false, error: "Cloud sync isn't configured." };
      const { error } = await supabase.auth.signInWithOtp({
        email: addr.trim(),
        options: {
          shouldCreateUser: true,
          emailRedirectTo: SUPABASE_REDIRECT_URL,
        },
      });
      if (error && /fetch|network/i.test(error.message)) {
        return {
          ok: false,
          error:
            "Couldn't reach the cloud — check your connection and try again.",
        };
      }
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
    signInOrSignUp,
    signInWithMagicLink,
    signOut,
  };
}
