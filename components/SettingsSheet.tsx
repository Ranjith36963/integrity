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

import { useState, useRef } from "react";
import { Sheet } from "@/components/ui/Sheet";
import { Button } from "@/components/ui/Button";
import { TimeInput } from "@/components/ui/TimeInput";
import type { AppState } from "@/lib/types";
import { STORAGE_KEY, migrate, saveState } from "@/lib/persist";
import { haptics } from "@/lib/haptics";
import { freezesUsedThisMonth, FREEZES_PER_MONTH } from "@/lib/insights";

interface Props {
  open: boolean;
  state: AppState;
  onClose: () => void;
  /** Called after user confirms reset — parent clears storage + reloads. */
  onResetAll: () => void;
  /** Called when user spends a freeze on today. Parent dispatches FREEZE_DAY. */
  onFreezeToday?: () => void;
  /** Weekday wake time "HH:MM" — the Mon–Fri day anchor. */
  weekdayStart?: string;
  /** Weekend wake time "HH:MM" — the Sat/Sun day anchor. */
  weekendStart?: string;
  /** Called with (kind, "HH:MM") when the user changes a wake time. */
  onSetDayStart?: (kind: "weekday" | "weekend", dayStart: string) => void;
  /** M11 DEC-2 — called with the chosen editing-past-days window (0/1/3). */
  onSetPastEditDays?: (days: 0 | 1 | 3) => void;
}

export function SettingsSheet({
  open,
  state,
  onClose,
  onResetAll,
  onFreezeToday,
  weekdayStart,
  weekendStart,
  onSetDayStart,
  onSetPastEditDays,
}: Props) {
  const pastEditDays: 0 | 1 | 3 =
    state.pastEditDays === 1 || state.pastEditDays === 3
      ? state.pastEditDays
      : 0;
  const pastEditOptions: { value: 0 | 1 | 3; label: string }[] = [
    { value: 0, label: "Read-only" },
    { value: 1, label: "Yesterday" },
    { value: 3, label: "3 days" },
  ];
  const [confirmingReset, setConfirmingReset] = useState(false);
  const [importStatus, setImportStatus] = useState<
    { kind: "idle" } | { kind: "error"; message: string }
  >({ kind: "idle" });
  const fileInputRef = useRef<HTMLInputElement>(null);

  function handleImportClick() {
    haptics.light();
    fileInputRef.current?.click();
  }

  async function handleImportFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    // Reset the input so re-selecting the same file fires the change event.
    e.target.value = "";
    if (!file) return;
    try {
      const text = await file.text();
      const parsed = JSON.parse(text) as unknown;
      // Pass through the same migration pipeline loadState uses so v1/v2
      // backups are auto-upgraded. migrate() returns null on irrecoverable
      // shape — surface that as an error rather than wiping their data.
      const migrated = migrate(parsed);
      if (!migrated) {
        setImportStatus({
          kind: "error",
          message: "That file isn't a recognised Dharma backup.",
        });
        return;
      }
      saveState(migrated);
      haptics.success();
      // Hard reload so usePersistedState re-runs its two-pass hydration on
      // the new payload and every view rebinds. Side-steps any race with
      // the live reducer holding the old state.
      window.location.reload();
    } catch {
      setImportStatus({
        kind: "error",
        message: "Couldn't parse the file. Make sure it's valid JSON.",
      });
    }
  }

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
        {/* ─── Day ─────────────────────────────────────────────────── */}
        {onSetDayStart && (
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
              Day starts at
            </h3>
            <p
              style={{
                margin: 0,
                fontFamily: "var(--font-ui)",
                fontSize: "var(--fs-12, 12px)",
                color: "var(--ink-dim)",
              }}
            >
              Your wake time. The day runs from here, so a sleep block across
              midnight stays one piece. Set weekdays and weekends separately.
            </p>
            <div style={{ display: "flex", gap: "16px" }}>
              <label
                style={{
                  display: "flex",
                  flexDirection: "column",
                  gap: "4px",
                  fontFamily: "var(--font-ui)",
                  fontSize: "var(--fs-12, 12px)",
                  color: "var(--ink-dim)",
                }}
              >
                Weekdays
                <div style={{ width: "96px" }}>
                  <TimeInput
                    id="settings-day-start-weekday"
                    value={weekdayStart ?? "04:00"}
                    onChange={(v) => {
                      if (/^\d{2}:\d{2}$/.test(v)) onSetDayStart("weekday", v);
                    }}
                  />
                </div>
              </label>
              <label
                style={{
                  display: "flex",
                  flexDirection: "column",
                  gap: "4px",
                  fontFamily: "var(--font-ui)",
                  fontSize: "var(--fs-12, 12px)",
                  color: "var(--ink-dim)",
                }}
              >
                Weekends
                <div style={{ width: "96px" }}>
                  <TimeInput
                    id="settings-day-start-weekend"
                    value={weekendStart ?? "04:00"}
                    onChange={(v) => {
                      if (/^\d{2}:\d{2}$/.test(v)) onSetDayStart("weekend", v);
                    }}
                  />
                </div>
              </label>
            </div>
          </section>
        )}

        {/* ─── Editing past days (M11 DEC-2) ───────────────────────── */}
        {onSetPastEditDays && (
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
              Editing past days
            </h3>
            <div
              role="radiogroup"
              aria-label="Editing past days"
              data-testid="settings-past-edit"
              style={{ display: "flex", gap: "6px" }}
            >
              {pastEditOptions.map((opt) => {
                const active = pastEditDays === opt.value;
                return (
                  <button
                    key={opt.value}
                    type="button"
                    role="radio"
                    aria-checked={active}
                    aria-label={opt.label}
                    onClick={() => {
                      haptics.light();
                      onSetPastEditDays(opt.value);
                    }}
                    style={{
                      flex: 1,
                      minHeight: "44px",
                      borderRadius: "8px",
                      border: `1px solid ${active ? "var(--accent)" : "var(--surface-2)"}`,
                      background: active ? "var(--accent)" : "var(--surface-1)",
                      color: active ? "var(--bg)" : "var(--ink)",
                      fontFamily: "var(--font-ui)",
                      fontSize: "var(--fs-12, 12px)",
                      cursor: "pointer",
                    }}
                  >
                    {opt.label}
                  </button>
                );
              })}
            </div>
            <p
              style={{
                fontFamily: "var(--font-ui)",
                fontSize: "var(--fs-10, 10px)",
                color: "var(--ink-dim)",
                margin: 0,
              }}
            >
              {pastEditDays === 0
                ? "The past is locked — your history stays honest."
                : `You can back-log the last ${pastEditDays === 1 ? "day" : `${pastEditDays} days`}.`}
            </p>
          </section>
        )}

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
              minHeight: "48px",
              padding: "var(--sp-12, 12px) var(--sp-16, 16px)",
              borderRadius: "8px",
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
          <button
            type="button"
            data-testid="settings-import"
            onClick={handleImportClick}
            className="tap"
            style={{
              width: "100%",
              minHeight: "48px",
              padding: "var(--sp-12, 12px) var(--sp-16, 16px)",
              borderRadius: "8px",
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
            <span>Import backup</span>
            <span
              style={{
                fontSize: "var(--fs-12, 12px)",
                color: "var(--ink-dim)",
              }}
            >
              Restore from a JSON file (replaces current data)
            </span>
          </button>
          {/* Hidden file input — triggered by the Import button. */}
          <input
            ref={fileInputRef}
            data-testid="settings-import-input"
            type="file"
            accept="application/json,.json"
            onChange={handleImportFile}
            style={{ display: "none" }}
          />
          {importStatus.kind === "error" && (
            <p
              role="alert"
              data-testid="settings-import-error"
              style={{
                margin: 0,
                marginTop: "4px",
                padding: "8px 12px",
                borderRadius: "8px",
                background: "color-mix(in srgb, var(--cat-5) 15%, transparent)",
                color: "var(--cat-5)",
                fontFamily: "var(--font-ui)",
                fontSize: "var(--fs-12, 12px)",
              }}
            >
              {importStatus.message}
            </p>
          )}
        </section>

        {/* ─── Streak freeze ────────────────────────────────────────── */}
        {onFreezeToday && (
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
              Streak freeze
            </h3>
            {(() => {
              const used = freezesUsedThisMonth(state, state.currentDate);
              const remaining = FREEZES_PER_MONTH - used;
              const todayFrozen =
                (state.freezes ?? {})[state.currentDate] === true;
              const disabled = todayFrozen || remaining <= 0;
              return (
                <button
                  type="button"
                  data-testid="settings-freeze-today"
                  aria-disabled={disabled ? "true" : undefined}
                  onClick={
                    disabled
                      ? undefined
                      : () => {
                          haptics.medium();
                          onFreezeToday();
                        }
                  }
                  className="tap"
                  style={{
                    width: "100%",
                    minHeight: "48px",
                    padding: "var(--sp-12, 12px) var(--sp-16, 16px)",
                    borderRadius: "8px",
                    border: "1px solid var(--surface-2)",
                    background: "var(--surface-1)",
                    color: "var(--ink)",
                    fontFamily: "var(--font-ui)",
                    fontSize: "var(--fs-14, 14px)",
                    textAlign: "left",
                    cursor: disabled ? "not-allowed" : "pointer",
                    opacity: disabled ? 0.5 : 1,
                    display: "flex",
                    flexDirection: "column",
                    gap: "2px",
                  }}
                >
                  <span>
                    {todayFrozen
                      ? "Today is frozen"
                      : remaining <= 0
                        ? "No freezes left this month"
                        : "Use a freeze for today"}
                  </span>
                  <span
                    style={{
                      fontSize: "var(--fs-12, 12px)",
                      color: "var(--ink-dim)",
                    }}
                  >
                    {remaining} of {FREEZES_PER_MONTH} remaining this month
                    {" · "}Freezing protects the streak when you miss a day.
                  </span>
                </button>
              );
            })()}
          </section>
        )}

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
                minHeight: "48px",
                padding: "var(--sp-12, 12px) var(--sp-16, 16px)",
                borderRadius: "8px",
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
                borderRadius: "8px",
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
                <Button
                  variant="secondary"
                  size="md"
                  className="flex-1"
                  data-testid="settings-reset-cancel"
                  onClick={() => setConfirmingReset(false)}
                >
                  Cancel
                </Button>
                <Button
                  variant="primary"
                  size="md"
                  className="flex-1 bg-[var(--cat-5)] hover:brightness-110"
                  data-testid="settings-reset-confirm-button"
                  onClick={handleConfirmReset}
                >
                  Erase
                </Button>
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
