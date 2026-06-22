"use client";
/**
 * components/InstallPrompt.tsx — PWA install affordance.
 *
 * Two install paths exist for a PWA:
 *   - Android Chrome / Edge / Samsung Internet: fires `beforeinstallprompt`
 *     on window. The event has a `prompt()` method that surfaces the
 *     native "Add to Home Screen" dialog.
 *   - iOS Safari: NO beforeinstallprompt event. Users add to home screen
 *     via the share sheet → "Add to Home Screen." We detect Safari +
 *     non-standalone display and show a small instructional pill instead.
 *
 * Behavior:
 *   - Renders a small dismissible pill below the ViewSwitcher tabs only
 *     when (a) the app is installable AND (b) the user hasn't dismissed
 *     within the last 30 days.
 *   - On Android: tap surfaces the native prompt via stored event.
 *   - On iOS: tap opens a tiny how-to overlay.
 *   - When `display-mode: standalone` matches (already installed), the
 *     component renders nothing.
 *
 * Dismissal persists in localStorage at key "dharma:install-dismissed-at"
 * as an ISO date string. Re-prompts 30 days after dismissal.
 */

import { useEffect, useState } from "react";

type BeforeInstallPromptEvent = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
};

const DISMISS_KEY = "dharma:install-dismissed-at";
const DISMISS_TTL_DAYS = 30;

function isStandalone(): boolean {
  if (typeof window === "undefined") return false;
  // iOS uses navigator.standalone (non-standard); others use display-mode media query
  const iosStandalone =
    "standalone" in navigator &&
    (navigator as unknown as { standalone?: boolean }).standalone === true;
  const mqStandalone =
    window.matchMedia &&
    window.matchMedia("(display-mode: standalone)").matches;
  return Boolean(iosStandalone || mqStandalone);
}

function isIOS(): boolean {
  if (typeof navigator === "undefined") return false;
  return /iPad|iPhone|iPod/.test(navigator.userAgent);
}

function wasRecentlyDismissed(): boolean {
  if (typeof window === "undefined") return true;
  try {
    const raw = window.localStorage.getItem(DISMISS_KEY);
    if (!raw) return false;
    const ms = Date.parse(raw);
    if (Number.isNaN(ms)) return false;
    const ageDays = (Date.now() - ms) / 86_400_000;
    return ageDays < DISMISS_TTL_DAYS;
  } catch {
    return true;
  }
}

export function InstallPrompt() {
  const [promptEvent, setPromptEvent] =
    useState<BeforeInstallPromptEvent | null>(null);
  const [show, setShow] = useState(false);
  const [iosOverlay, setIosOverlay] = useState(false);

  useEffect(() => {
    if (isStandalone()) return; // already installed
    if (wasRecentlyDismissed()) return;

    if (isIOS()) {
      // iOS — no beforeinstallprompt; show the static how-to pill.
      setShow(true);
      return;
    }

    const handler = (e: Event) => {
      e.preventDefault();
      setPromptEvent(e as BeforeInstallPromptEvent);
      setShow(true);
    };
    window.addEventListener("beforeinstallprompt", handler);
    return () => window.removeEventListener("beforeinstallprompt", handler);
  }, []);

  function dismiss() {
    setShow(false);
    setIosOverlay(false);
    try {
      window.localStorage.setItem(DISMISS_KEY, new Date().toISOString());
    } catch {
      /* best-effort */
    }
  }

  async function handleInstall() {
    if (isIOS()) {
      setIosOverlay(true);
      return;
    }
    if (!promptEvent) return;
    try {
      await promptEvent.prompt();
      const choice = await promptEvent.userChoice;
      if (choice.outcome === "accepted") {
        setShow(false);
      } else {
        dismiss();
      }
    } catch {
      dismiss();
    }
  }

  if (!show) return null;

  return (
    <>
      <div
        data-testid="install-prompt"
        role="region"
        aria-label="Install Dharma"
        style={{
          display: "flex",
          alignItems: "center",
          gap: "8px",
          padding: "8px 12px",
          margin: "8px 12px 0",
          borderRadius: "10px",
          border: "1px solid var(--surface-2)",
          background: "var(--surface-1)",
          fontFamily: "var(--font-ui)",
          fontSize: "var(--fs-12, 12px)",
        }}
      >
        <span style={{ color: "var(--ink)" }}>
          Install Dharma{" "}
          <span style={{ color: "var(--ink-dim)" }}>
            for a faster, full-screen feel.
          </span>
        </span>
        <div style={{ marginLeft: "auto", display: "flex", gap: "4px" }}>
          <button
            type="button"
            data-testid="install-prompt-install"
            onClick={handleInstall}
            className="tap"
            style={{
              padding: "4px 12px",
              minHeight: "32px",
              borderRadius: "999px",
              border: "none",
              background: "var(--accent)",
              color: "var(--bg)",
              fontFamily: "var(--font-ui)",
              fontSize: "var(--fs-12, 12px)",
              letterSpacing: "0.06em",
              textTransform: "uppercase",
              cursor: "pointer",
            }}
          >
            Install
          </button>
          <button
            type="button"
            data-testid="install-prompt-dismiss"
            aria-label="Dismiss install prompt"
            onClick={dismiss}
            className="tap"
            style={{
              width: "32px",
              minHeight: "32px",
              borderRadius: "999px",
              border: "none",
              background: "transparent",
              color: "var(--ink-dim)",
              cursor: "pointer",
              fontSize: "var(--fs-16, 16px)",
              lineHeight: 1,
            }}
          >
            ×
          </button>
        </div>
      </div>

      {iosOverlay && (
        <div
          role="dialog"
          aria-modal="true"
          aria-label="How to install on iOS"
          data-testid="install-prompt-ios-howto"
          onClick={dismiss}
          style={{
            position: "fixed",
            inset: 0,
            zIndex: 65,
            background: "rgba(0,0,0,0.6)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            padding: "24px",
          }}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            style={{
              maxWidth: "320px",
              background: "var(--bg-elev)",
              border: "1px solid var(--surface-2)",
              borderRadius: "12px",
              padding: "20px",
              fontFamily: "var(--font-ui)",
              fontSize: "var(--fs-14, 14px)",
              color: "var(--ink)",
              display: "flex",
              flexDirection: "column",
              gap: "12px",
            }}
          >
            <h2
              style={{
                margin: 0,
                fontFamily: "var(--font-display)",
                fontStyle: "italic",
                fontSize: "var(--fs-22, 22px)",
              }}
            >
              Add to Home Screen
            </h2>
            <ol
              style={{
                margin: 0,
                paddingLeft: "20px",
                color: "var(--ink-dim)",
                lineHeight: 1.6,
              }}
            >
              <li>Tap the Share button in Safari.</li>
              <li>Scroll down and tap &ldquo;Add to Home Screen&rdquo;.</li>
              <li>Tap Add in the top-right.</li>
            </ol>
            <button
              type="button"
              onClick={dismiss}
              className="tap"
              style={{
                minHeight: "44px",
                marginTop: "4px",
                borderRadius: "8px",
                border: "none",
                background: "var(--accent)",
                color: "var(--bg)",
                fontFamily: "var(--font-ui)",
                fontSize: "var(--fs-14, 14px)",
                letterSpacing: "0.08em",
                textTransform: "uppercase",
                cursor: "pointer",
              }}
            >
              Got it
            </button>
          </div>
        </div>
      )}
    </>
  );
}
