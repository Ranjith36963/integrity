"use client";
/**
 * components/CloudSync.tsx — M11 Step 4: background cloud backup (renders nothing).
 *
 * Mounted once. When signed in it runs one reconciling sync (last-write-wins via
 * lib/cloudSync) and then pushes local changes to Supabase on a light interval +
 * when the tab is hidden. EVERY network call is wrapped so a failure (offline,
 * policy, RLS) is a silent no-op — localStorage is always the source of truth and
 * nothing is ever lost. When cloud is off (no client / signed out) it does nothing.
 *
 * Data-safety invariants (M11 sync audit):
 *  1. NO push happens before the initial reconcile finishes. The interval and
 *     visibilitychange handlers are gated on `synced` — otherwise a device with
 *     stale data could upsert it over a newer cloud copy while the initial pull
 *     was still in flight (visibilitychange fires during sign-in itself, when
 *     the user switches to their email app for the code).
 *  2. Local data this build can't parse (a FUTURE schemaVersion — possible when
 *     a stale service worker serves old app code) freezes sync entirely for the
 *     session: never overwritten by remote, never pushed. The transport applies
 *     the mirror rule to unrecognizable remote rows (pull throws, pass no-ops).
 *  3. A "noop" verdict (equal timestamps) only marks the local raw as pushed if
 *     the CONTENT actually matches the cloud — edits made while signed out do
 *     not advance the timestamp, so equal stamps can hide unpushed changes.
 */
import { useEffect, useRef } from "react";
import { getSupabase } from "@/lib/supabaseClient";
import { makeSupabaseTransport } from "@/lib/supabaseTransport";
import { syncOnce } from "@/lib/cloudSync";
import { migrate, STORAGE_KEY, type PersistedState } from "@/lib/persist";

const TS_KEY = `${STORAGE_KEY}:updatedAt`;

type LocalRead =
  | { kind: "none" } // nothing stored → fresh device
  | { kind: "garbage" } // unparseable JSON — the app itself would reset it
  | { kind: "unrecognized" } // parses, but a schemaVersion this build can't read
  | { kind: "ok"; state: PersistedState; raw: string };

function readLocal(): LocalRead {
  const raw = localStorage.getItem(STORAGE_KEY);
  if (!raw) return { kind: "none" };
  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    return { kind: "garbage" };
  }
  const state = migrate(parsed);
  if (!state) return { kind: "unrecognized" };
  return { kind: "ok", state, raw };
}

export function CloudSync() {
  const lastPushedRaw = useRef<string | null>(null);

  useEffect(() => {
    const supabase = getSupabase();
    if (!supabase) return;

    let userId: string | null = null;
    let disposed = false;
    let synced = false; // initial reconcile done → pushes allowed
    let inFlight = false; // an initialSync is running → don't start another
    let frozen = false; // local data from a newer app version → hands off

    const nowIso = () => new Date().toISOString();

    async function initialSync() {
      if (!userId || disposed || inFlight || frozen) return;
      inFlight = true;
      try {
        const transport = makeSupabaseTransport(supabase!, userId);
        const local = readLocal();

        if (local.kind === "unrecognized") {
          // Newer-version data on this device (stale SW serving old code).
          // Touch nothing in either direction until the app code catches up.
          frozen = true;
          return;
        }

        if (local.kind === "none" || local.kind === "garbage") {
          // Fresh device (or locally unreadable data the app would discard
          // anyway) → adopt whatever the cloud has.
          const remote = await transport.pull();
          if (remote && !disposed) {
            localStorage.setItem(STORAGE_KEY, JSON.stringify(remote.state));
            localStorage.setItem(TS_KEY, remote.updatedAt);
            location.reload();
            return;
          }
          synced = true; // nothing anywhere yet — first edit will push
          return;
        }

        // Stamp local now if it has never been stamped, so existing on-device
        // data is treated as a real edit and pushed (never silently overwritten).
        let localTs = localStorage.getItem(TS_KEY);
        if (!localTs) {
          localTs = nowIso();
          localStorage.setItem(TS_KEY, localTs);
        }

        const pushStamp = nowIso();
        const { decision, state, remote } = await syncOnce(
          local.state,
          localTs,
          pushStamp,
          transport,
        );
        if (disposed) return;
        if (decision.action === "pull") {
          localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
          // Stamp with the REMOTE's timestamp (not "now") so the next open
          // reads "already in sync" instead of echo-pushing with a fresh stamp.
          localStorage.setItem(TS_KEY, remote?.updatedAt ?? nowIso());
          location.reload();
          return;
        }
        if (decision.action === "push") {
          localStorage.setItem(TS_KEY, pushStamp);
          lastPushedRaw.current = local.raw;
        } else {
          // noop: equal timestamps. Only trust it if the CONTENT matches too —
          // signed-out edits don't advance the timestamp. Compare via the same
          // migrate() path so key order is canonical on both sides.
          const same =
            remote != null &&
            JSON.stringify(local.state) === JSON.stringify(remote.state);
          if (same) {
            lastPushedRaw.current = local.raw;
          }
          // else: leave lastPushedRaw null → the next tick pushes local.
        }
        synced = true;
      } catch {
        /* offline / policy / RLS error → keep localStorage untouched; the
           interval retries initialSync until it succeeds */
      } finally {
        inFlight = false;
      }
    }

    async function pushIfChanged() {
      // Gated on `synced`: pushing before the initial reconcile could upsert
      // stale local data over a newer cloud copy.
      if (!userId || disposed || !synced || frozen) return;
      const local = readLocal();
      if (local.kind !== "ok" || local.raw === lastPushedRaw.current) return;
      const t = nowIso();
      try {
        localStorage.setItem(TS_KEY, t);
        await makeSupabaseTransport(supabase!, userId).push(local.state, t);
        lastPushedRaw.current = local.raw;
      } catch {
        /* leave lastPushedRaw so we retry on the next tick */
      }
    }

    const tick = () => {
      if (!synced) void initialSync();
      else void pushIfChanged();
    };

    supabase.auth.getSession().then(({ data }) => {
      userId = data.session?.user?.id ?? null;
      if (userId) void initialSync();
    });
    const { data: sub } = supabase.auth.onAuthStateChange((_event, session) => {
      const uid = session?.user?.id ?? null;
      if (uid && uid !== userId) {
        userId = uid;
        synced = false;
        lastPushedRaw.current = null;
        void initialSync();
      } else {
        userId = uid;
      }
    });

    const timer = window.setInterval(tick, 6000);
    const onHide = () => void pushIfChanged();
    document.addEventListener("visibilitychange", onHide);

    return () => {
      disposed = true;
      sub.subscription.unsubscribe();
      window.clearInterval(timer);
      document.removeEventListener("visibilitychange", onHide);
    };
  }, []);

  return null;
}
