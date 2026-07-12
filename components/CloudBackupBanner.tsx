"use client";
/**
 * components/CloudBackupBanner.tsx — M11 Option 3: gentle, one-time backup nudge.
 *
 * Shows a small dismissible banner ONCE the user has built something, when cloud
 * backup is configured but they're not signed in. Tapping "Back up" opens the
 * cloud sign-in; "×" dismisses it forever (persisted). Never blocks anything and
 * never shows when cloud is off or the user is already signed in.
 */
import { useEffect, useState } from "react";
import { X } from "lucide-react";
import { useSupabaseSession } from "@/lib/useSupabaseSession";

const DISMISS_KEY = "dharma:cloud-nudge-dismissed";

type Props = {
  /** True once the user has real data worth backing up (≥1 block). */
  hasData: boolean;
  /** Open the cloud sign-in (Settings). */
  onSignIn: () => void;
};

export function CloudBackupBanner({ hasData, onSignIn }: Props) {
  const { ready, email, configured } = useSupabaseSession();
  const [dismissed, setDismissed] = useState(true); // start hidden; reveal post-mount

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- one-shot read of the persisted dismissal on mount (SSR-safe two-pass)
    setDismissed(localStorage.getItem(DISMISS_KEY) === "1");
  }, []);

  // Hide unless: cloud on, auth resolved, signed OUT, has data, not dismissed.
  if (!configured || !ready || email || !hasData || dismissed) return null;

  function dismiss() {
    localStorage.setItem(DISMISS_KEY, "1");
    setDismissed(true);
  }

  return (
    <div
      role="status"
      data-testid="cloud-backup-banner"
      style={{
        display: "flex",
        alignItems: "center",
        gap: "8px",
        margin: "8px 12px",
        padding: "10px 12px",
        borderRadius: "10px",
        border: "1px solid var(--card-edge)",
        background: "var(--surface-1)",
      }}
    >
      <span style={{ fontSize: "16px", flexShrink: 0 }} aria-hidden="true">
        💾
      </span>
      <span
        style={{
          flex: 1,
          color: "var(--ink)",
          fontFamily: "var(--font-ui)",
          fontSize: "var(--fs-12, 12px)",
        }}
      >
        Back up your data so you never lose it if you change phones.
      </span>
      <button
        type="button"
        data-testid="cloud-banner-signin"
        onClick={onSignIn}
        style={{
          flexShrink: 0,
          height: "36px",
          padding: "0 12px",
          borderRadius: "8px",
          border: "1px solid rgba(251,191,36,0.5)",
          background:
            "linear-gradient(180deg, rgba(251,191,36,0.2), rgba(251,191,36,0.08))",
          color: "var(--accent)",
          boxShadow: "0 0 16px -6px var(--amber-glow)",
          fontFamily: "var(--font-ui)",
          fontSize: "var(--fs-12, 12px)",
          cursor: "pointer",
        }}
      >
        Back up
      </button>
      <button
        type="button"
        aria-label="Dismiss backup reminder"
        data-testid="cloud-banner-dismiss"
        onClick={dismiss}
        style={{
          flexShrink: 0,
          display: "grid",
          placeItems: "center",
          width: "32px",
          height: "36px",
          background: "transparent",
          border: "none",
          color: "var(--ink-dim)",
          cursor: "pointer",
        }}
      >
        <X size={16} />
      </button>
    </div>
  );
}
