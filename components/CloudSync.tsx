"use client";
/**
 * components/CloudSync.tsx — M11 Step 4: background cloud backup (renders nothing).
 *
 * Mounted once. When signed in it runs one reconciling sync (last-write-wins via
 * lib/cloudSync) and then pushes local changes to Supabase on a light interval +
 * when the tab is hidden. EVERY network call is wrapped so a failure (offline,
 * policy, RLS) is a silent no-op — localStorage is always the source of truth and
 * nothing is ever lost. When cloud is off (no client / signed out) it does nothing.
 */
import { useEffect, useRef } from "react";
import { getSupabase } from "@/lib/supabaseClient";
import { makeSupabaseTransport } from "@/lib/supabaseTransport";
import { syncOnce } from "@/lib/cloudSync";
import { migrate, STORAGE_KEY } from "@/lib/persist";

const TS_KEY = `${STORAGE_KEY}:updatedAt`;

export function CloudSync() {
  const lastPushedRaw = useRef<string | null>(null);

  useEffect(() => {
    const supabase = getSupabase();
    if (!supabase) return;

    let userId: string | null = null;
    let disposed = false;

    const nowIso = () => new Date().toISOString();
    const readLocalRaw = () => localStorage.getItem(STORAGE_KEY);
    const readLocal = () => {
      const raw = readLocalRaw();
      if (!raw) return null;
      try {
        return migrate(JSON.parse(raw));
      } catch {
        return null;
      }
    };

    async function initialSync() {
      if (!userId || disposed) return;
      try {
        const transport = makeSupabaseTransport(supabase!, userId);
        const raw = readLocalRaw();
        const local = readLocal();

        if (!local) {
          // No usable local data → adopt whatever the cloud has (fresh device).
          const remote = await transport.pull();
          if (remote && !disposed) {
            localStorage.setItem(STORAGE_KEY, JSON.stringify(remote.state));
            localStorage.setItem(TS_KEY, remote.updatedAt);
            location.reload();
          }
          return;
        }

        // Stamp local now if it has never been stamped, so existing on-device
        // data is treated as a real edit and pushed (never silently overwritten).
        let localTs = localStorage.getItem(TS_KEY);
        if (!localTs) {
          localTs = nowIso();
          localStorage.setItem(TS_KEY, localTs);
        }

        const { decision, state } = await syncOnce(
          local,
          localTs,
          nowIso(),
          transport,
        );
        if (disposed) return;
        if (decision.action === "pull") {
          localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
          localStorage.setItem(TS_KEY, nowIso());
          location.reload();
        } else {
          lastPushedRaw.current = raw;
        }
      } catch {
        /* offline / policy / RLS error → keep localStorage untouched */
      }
    }

    async function pushIfChanged() {
      if (!userId || disposed) return;
      const raw = readLocalRaw();
      if (!raw || raw === lastPushedRaw.current) return;
      const local = readLocal();
      if (!local) return;
      const t = nowIso();
      try {
        localStorage.setItem(TS_KEY, t);
        await makeSupabaseTransport(supabase!, userId).push(local, t);
        lastPushedRaw.current = raw;
      } catch {
        /* leave lastPushedRaw so we retry on the next tick */
      }
    }

    supabase.auth.getSession().then(({ data }) => {
      userId = data.session?.user?.id ?? null;
      if (userId) void initialSync();
    });
    const { data: sub } = supabase.auth.onAuthStateChange((_event, session) => {
      const uid = session?.user?.id ?? null;
      if (uid && uid !== userId) {
        userId = uid;
        void initialSync();
      } else {
        userId = uid;
      }
    });

    const timer = window.setInterval(() => void pushIfChanged(), 6000);
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
