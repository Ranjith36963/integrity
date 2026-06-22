"use client";
/**
 * components/SettingsSheet.tsx — settings panel.
 *
 * Replaces the previously-disabled gear button in TopBar. Renders inside
 * the Sheet primitive so it inherits header (title + close) and safe-area
 * insets for free.
 *
 * Scope (solo-user, mobile-first, free product):
 *   - Data export: download the entire app state as a JSON file.
 *     Single backup primitive — works across devices.
 *   - Reset: delete every saved block, brick, category and history.
 *     Confirm-modal protected; iOS convention.
 *   - About: app name + version + program-start date (read-only).
 *
 * What's intentionally absent (and why):
 *   - Theme toggle — the dark blueprint IS the brand. Adding a light
 *     theme would dilute the signature.
 *   - Timezone — the browser/device decides. Showing it would suggest
 *     it's editable; it isn't.
 *   - Notifications — defer until M10 (Voice Log) when push infra lands.
 */

import { useState } from "react";
import { Sheet } from "@/components/ui/Sheet";
import type { AppState } from "@/lib/types";
import { STORAGE_KEY } from "@/lib/persist";
import { haptics } from "@/lib/haptics";

interface Props {
  open: boolean;
  state: AppState;
  onClose: () => void;
  /** Called after user confirms reset — parent clears storage + reloads. */
  onResetAll: () => void;
}

export function SettingsSheet({ open, state, onClose, onResetAll }: Props) {
  const [confirmingReset, setConfirmingReset] = useState(false);

  function handleExport() {
    haptics.light();
    // Read the raw persisted payload — this matches exactly what loadState()
    // would read on a different device, so it's a true round-trip backup.
    const payload =
      (typeof window !== "undefined" &&
        window.localStorage.getItem(STORAGE_KEY)) ||
      JSON.stringify(state);
    const blob = new Blob([payload], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    const today = new Date().toISOString().slice(0, 10);
    a.download = `dharma-backup-${today}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }

  function handleConfirmReset() {
    haptics.medium();
    onResetAll();
    setConfirmingReset(false);
  }

  // Building summary numbers for "About" panel
  const blockCount = state.blocks.length;
  const looseCount = state.looseBricks.length;
  const historyDays = Object.keys(state.history).length;

  return (
    <Sheet open={open} onClose={onClose} title="Settings">
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          gap: "var(--sp-24, 24px)",
          paddingBottom: "var(--sp-24, 24px)",
        }}
      >
        {/* ─── Data ────────────────────────────────────────────────── */}
        <section
          style={{ display: "flex", flexDirection: "column", gap: "8px" }}
        >
          <h3
            style={{
              fontFamily: "var(--font-ui)",
              fontSize: "var(--fs-10, 10px)",
              color: "var(--ink-dim)",
              letterSpacing: "0.18em",
              textTransform: "uppercase",
              margin: 0,
            }}
          >
            Data
          </h3>
          <button
            type="button"
            data-testid="settings-export"
            onClick={handleExport}
            className="tap"
            style={{
              width: "100%",
              minHeight: "52px",
              padding: "var(--sp-12, 12px) var(--sp-16, 16px)",
              borderRadius: "10px",
              border: "1px solid var(--surface-2)",
              background: "var(--surface-1)",
              color: "var(--ink)",
              fontFamily: "var(--font-ui)",
              fontSize: "var(--fs-14, 14px)",
              textAlign: "left",
              cursor: "pointer",
              display: "flex",
              flexDirection: "column",
              gap: "2px",
            }}
          >
            <span>Export everything</span>
            <span
              style={{
                fontSize: "var(--fs-12, 12px)",
                color: "var(--ink-dim)",
              }}
            >
              Download a JSON backup
            </span>
          </button>
        </section>

        {/* ─── Reset ────────────────────────────────────────────────── */}
        <section
          style={{ display: "flex", flexDirection: "column", gap: "8px" }}
        >
          <h3
            style={{
              fontFamily: "var(--font-ui)",
              fontSize: "var(--fs-10, 10px)",
              color: "var(--ink-dim)",
              letterSpacing: "0.18em",
              textTransform: "uppercase",
              margin: 0,
            }}
          >
            Danger zone
          </h3>
          {!confirmingReset ? (
            <button
              type="button"
              data-testid="settings-reset"
              onClick={() => setConfirmingReset(true)}
              className="tap"
              style={{
                width: "100%",
                minHeight: "52px",
                padding: "var(--sp-12, 12px) var(--sp-16, 16px)",
                borderRadius: "10px",
                border: "1px solid var(--surface-2)",
                background: "var(--surface-1)",
                color: "var(--ink)",
                fontFamily: "var(--font-ui)",
                fontSize: "var(--fs-14, 14px)",
                textAlign: "left",
                cursor: "pointer",
                display: "flex",
                flexDirection: "column",
                gap: "2px",
              }}
            >
              <span>Erase all data</span>
              <span
                style={{
                  fontSize: "var(--fs-12, 12px)",
                  color: "var(--ink-dim)",
                }}
              >
                Removes every block, brick, category, and history entry.
              </span>
            </button>
          ) : (
            <div
              role="alertdialog"
              data-testid="settings-reset-confirm"
              style={{
                padding: "var(--sp-16, 16px)",
                borderRadius: "10px",
                border: "1px solid var(--cat-5)",
                background: "var(--surface-1)",
                display: "flex",
                flexDirection: "column",
                gap: "12px",
              }}
            >
              <p
                style={{
                  fontFamily: "var(--font-ui)",
                  fontSize: "var(--fs-14, 14px)",
                  color: "var(--ink)",
                  margin: 0,
                }}
              >
                This will permanently delete everything Dharma has saved. It
                cannot be undone.
              </p>
              <div style={{ display: "flex", gap: "8px" }}>
                <button
                  type="button"
                  data-testid="settings-reset-cancel"
                  onClick={() => setConfirmingReset(false)}
                  className="tap"
                  style={{
                    flex: 1,
                    minHeight: "44px",
                    borderRadius: "8px",
                    border: "1px solid var(--ink-dim)",
                    background: "transparent",
                    color: "var(--ink-dim)",
                    fontFamily: "var(--font-ui)",
                    fontSize: "var(--fs-14, 14px)",
                    cursor: "pointer",
                    letterSpacing: "0.06em",
                    textTransform: "uppercase",
                  }}
                >
                  Cancel
                </button>
                <button
                  type="button"
                  data-testid="settings-reset-confirm-button"
                  onClick={handleConfirmReset}
                  className="tap"
                  style={{
                    flex: 1,
                    minHeight: "44px",
                    borderRadius: "8px",
                    border: "none",
                    background: "var(--cat-5)",
                    color: "var(--bg)",
                    fontFamily: "var(--font-ui)",
                    fontSize: "var(--fs-14, 14px)",
                    cursor: "pointer",
                    letterSpacing: "0.06em",
                    textTransform: "uppercase",
                  }}
                >
                  Erase
                </button>
              </div>
            </div>
          )}
        </section>

        {/* ─── About ────────────────────────────────────────────────── */}
        <section
          style={{ display: "flex", flexDirection: "column", gap: "8px" }}
        >
          <h3
            style={{
              fontFamily: "var(--font-ui)",
              fontSize: "var(--fs-10, 10px)",
              color: "var(--ink-dim)",
              letterSpacing: "0.18em",
              textTransform: "uppercase",
              margin: 0,
            }}
          >
            About
          </h3>
          <dl
            data-testid="settings-about"
            style={{
              margin: 0,
              display: "grid",
              gridTemplateColumns: "auto 1fr",
              gap: "6px 16px",
              fontFamily: "var(--font-ui)",
              fontSize: "var(--fs-12, 12px)",
            }}
          >
            <dt style={{ color: "var(--ink-dim)" }}>Started</dt>
            <dd style={{ margin: 0, color: "var(--ink)" }}>
              {state.programStart}
            </dd>

            <dt style={{ color: "var(--ink-dim)" }}>Blocks</dt>
            <dd style={{ margin: 0, color: "var(--ink)" }}>{blockCount}</dd>

            <dt style={{ color: "var(--ink-dim)" }}>Loose bricks</dt>
            <dd style={{ margin: 0, color: "var(--ink)" }}>{looseCount}</dd>

            <dt style={{ color: "var(--ink-dim)" }}>Days archived</dt>
            <dd style={{ margin: 0, color: "var(--ink)" }}>{historyDays}</dd>
          </dl>
        </section>
      </div>
    </Sheet>
  );
}
