"use client";
/**
 * components/Welcome.tsx — first-launch hero screen.
 *
 * The user opens Dharma for the first time. Instead of dropping them
 * straight into an empty blueprint, this single-screen welcome grounds
 * the metaphor (brick → block → building) and gives them one obvious
 * action: tap to start.
 *
 * Design lead notes (frontend-design skill):
 *   - Subject is "building intentional days." The hero is the metaphor
 *     itself: a stacked brick illustration in the amber-on-blueprint
 *     palette. No stock photography, no gradient blob.
 *   - One signature italic-serif line ("Build your day, brick by brick.")
 *     reuses the % numeral's typographic voice.
 *   - Body explains the unit chain in plain language — three short lines,
 *     no marketing copy.
 *   - One primary CTA, full-width. No social-login soup, no skip link,
 *     no progress indicator. There is one screen and one action.
 *   - Honors prefers-reduced-motion via the CSS layer (no JS animation).
 *
 * Behavior: rendered as a fixed full-screen overlay above the main app
 * (z-60, above sheets at z-50 to ensure no leakage). Dismiss is a single
 * tap on the CTA; ESC also dismisses for keyboard users.
 */

import { useEffect } from "react";

interface Props {
  onBegin: () => void;
}

export function Welcome({ onBegin }: Props) {
  // Esc-to-dismiss keyboard parity with sheets.
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") onBegin();
    };
    document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
  }, [onBegin]);

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="welcome-title"
      data-testid="welcome"
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 60,
        background: "var(--bg)",
        color: "var(--ink)",
        display: "flex",
        flexDirection: "column",
        paddingTop: "calc(var(--safe-top, 0px) + var(--sp-32, 32px))",
        paddingBottom: "calc(var(--safe-bottom, 0px) + var(--sp-24, 24px))",
        paddingLeft: "var(--sp-24, 24px)",
        paddingRight: "var(--sp-24, 24px)",
      }}
    >
      {/* Brand-mark — small, top-left, matches TopBar's identity */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: "8px",
          marginBottom: "var(--sp-48, 48px)",
        }}
      >
        <div
          aria-hidden
          style={{
            height: "20px",
            width: "20px",
            borderRadius: "3px",
            background:
              "linear-gradient(180deg, var(--amber), var(--amber-deep))",
            boxShadow:
              "inset 0 1px 0 rgba(255,255,255,0.35), 0 0 14px -3px var(--amber-glow)",
          }}
        />
        <span
          style={{
            fontSize: "13px",
            letterSpacing: "0.32em",
            color: "var(--ink)",
            fontFamily: "var(--font-ui)",
          }}
        >
          DHARMA
        </span>
      </div>

      {/* Hero stack — the brick metaphor as a real spatial idea, not an icon */}
      <div
        aria-hidden
        style={{
          display: "flex",
          flexDirection: "column",
          gap: "6px",
          marginBottom: "var(--sp-32, 32px)",
          maxWidth: "200px",
        }}
      >
        {[1, 2, 3].map((row) => (
          <div
            key={row}
            style={{
              display: "flex",
              gap: "6px",
              opacity: 0.35 + row * 0.15,
            }}
          >
            {Array.from({ length: row + 1 }, (_, i) => (
              <span
                key={i}
                className="brick"
                style={{
                  height: "18px",
                  width: `${40 + (i % 2) * 8}px`,
                }}
              />
            ))}
          </div>
        ))}
      </div>

      {/* Signature line — the only italic serif on this screen. */}
      <h1
        id="welcome-title"
        style={{
          fontFamily: "var(--font-display)",
          fontStyle: "italic",
          fontSize: "var(--fs-32, 32px)",
          lineHeight: 1.1,
          letterSpacing: "-0.02em",
          color: "var(--ink)",
          margin: 0,
          marginBottom: "var(--sp-16, 16px)",
        }}
      >
        Build your day,
        <br />
        brick by brick.
      </h1>

      {/* Body — three short lines, no marketing puff */}
      <p
        style={{
          fontFamily: "var(--font-ui)",
          fontSize: "var(--fs-14, 14px)",
          lineHeight: 1.6,
          color: "var(--ink-dim)",
          margin: 0,
          marginBottom: "auto",
          maxWidth: "32ch",
        }}
      >
        Bricks are habits.
        <br />
        Blocks are routines.
        <br />
        Buildings are days.
      </p>

      {/* Primary CTA — single, full-width, the action the screen is for */}
      <button
        type="button"
        data-testid="welcome-begin"
        onClick={onBegin}
        className="tap"
        style={{
          height: "52px",
          width: "100%",
          borderRadius: "12px",
          border: "none",
          background: "var(--accent)",
          color: "var(--bg)",
          fontFamily: "var(--font-ui)",
          fontSize: "var(--fs-14, 14px)",
          letterSpacing: "0.12em",
          textTransform: "uppercase",
          cursor: "pointer",
          marginTop: "var(--sp-24, 24px)",
        }}
      >
        Lay your first brick
      </button>
    </div>
  );
}
