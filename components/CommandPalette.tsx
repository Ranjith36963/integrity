"use client";
/**
 * components/CommandPalette.tsx — ⌘K / Ctrl+K power-user surface.
 *
 * Why this exists (research synthesis 2026-06-23): every modern
 * productivity tool that earns power-user retention has a command
 * palette — Superhuman, Linear, Notion, VS Code, Raycast. The pattern
 * shortens the path from intent → action by letting users skip linear
 * navigation. It also TEACHES shortcuts inline ("Add Block ⌘B") so
 * users learn the keyboard layer without a manual.
 *
 * Sci-fi framing: the command palette is the "ship command line" —
 * the architect speaks intent to their construction machine. Liquid-
 * Glass overlay (backdrop-blur + thin amber border) with a contrast
 * fallback for prefers-reduced-transparency.
 *
 * Open: ⌘K (macOS) or Ctrl+K (Win/Linux). Close: Esc or backdrop tap.
 * Selection: arrow keys + Enter, or click.
 *
 * The component is a pure UI surface — it receives the command list
 * and a runner from the parent. No business logic lives here.
 */

import { useEffect, useRef, useState, useMemo } from "react";

export type Command = {
  /** Stable id used for the recent list. */
  id: string;
  /** What the user reads in the list. */
  label: string;
  /** Optional secondary line — "Switches to the Day view," etc. */
  hint?: string;
  /** Keyboard shortcut to display ("⌘B", "⇧⌘D"). Purely display. */
  shortcut?: string;
  /** Lucide icon component, optional. */
  icon?: React.ComponentType<{ size?: number }>;
  /** Called when the user activates this command. */
  run: () => void;
  /** Searchable aliases — typing any of these matches. */
  keywords?: string[];
};

type Props = {
  open: boolean;
  onClose: () => void;
  commands: Command[];
};

const RECENT_KEY = "dharma:command-palette-recent";
const RECENT_LIMIT = 3;

function loadRecent(): string[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(RECENT_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed)) return [];
    return parsed.filter((x): x is string => typeof x === "string");
  } catch {
    return [];
  }
}

function pushRecent(id: string): void {
  if (typeof window === "undefined") return;
  try {
    const cur = loadRecent().filter((x) => x !== id);
    const next = [id, ...cur].slice(0, RECENT_LIMIT);
    window.localStorage.setItem(RECENT_KEY, JSON.stringify(next));
  } catch {
    /* localStorage may throw in private mode — silently no-op */
  }
}

function score(cmd: Command, query: string): number {
  if (query === "") return 0;
  const q = query.toLowerCase();
  const label = cmd.label.toLowerCase();
  const kw = (cmd.keywords ?? []).map((k) => k.toLowerCase()).join(" ");
  const haystack = `${label} ${kw} ${cmd.hint ?? ""}`.toLowerCase();
  // Cheap fuzzy: prefix hit > substring hit > miss.
  if (label.startsWith(q)) return 100;
  if (label.includes(q)) return 50;
  if (haystack.includes(q)) return 25;
  // Character-by-character subsequence match (last-resort)
  let i = 0;
  for (const ch of haystack) {
    if (ch === q[i]) i++;
    if (i === q.length) return 5;
  }
  return 0;
}

export function CommandPalette({ open, onClose, commands }: Props) {
  const [query, setQuery] = useState("");
  const [activeIdx, setActiveIdx] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);

  // Reset query + selection every time the palette (re)opens.
  // The setStates inside sync UI state with the `open` prop edge — one-
  // shot on every false→true transition, not a cascade.
  useEffect(() => {
    if (open) {
      // eslint-disable-next-line react-hooks/set-state-in-effect -- prop-edge sync, see comment above
      setQuery("");
      setActiveIdx(0);
      // Focus the input AFTER the iris transition starts so the user
      // immediately sees the cursor blink in the search field.
      const t = window.setTimeout(() => inputRef.current?.focus(), 50);
      return () => window.clearTimeout(t);
    }
  }, [open]);

  // Close on Escape — at the document level so the palette catches
  // it even when something else has focus first.
  useEffect(() => {
    if (!open) return;
    const h = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.preventDefault();
        onClose();
      }
    };
    document.addEventListener("keydown", h);
    return () => document.removeEventListener("keydown", h);
  }, [open, onClose]);

  // Compute the visible command list — query-filtered + ranked,
  // with recent commands surfaced first on an empty query.
  const filtered = useMemo<Command[]>(() => {
    if (query.trim() === "") {
      // Empty query: recent N at top, then everything else, dedup'd.
      const recent = loadRecent();
      const byId = new Map(commands.map((c) => [c.id, c]));
      const recentCmds = recent
        .map((id) => byId.get(id))
        .filter((c): c is Command => c !== undefined);
      const rest = commands.filter((c) => !recent.includes(c.id));
      return [...recentCmds, ...rest];
    }
    const scored = commands
      .map((c) => ({ c, s: score(c, query) }))
      .filter((x) => x.s > 0)
      .sort((a, b) => b.s - a.s);
    return scored.map((x) => x.c);
  }, [query, commands]);

  // Clamp activeIdx whenever the filtered list shrinks
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- one-shot clamp when the upper bound (filtered.length) changes via query typing
    if (activeIdx >= filtered.length) setActiveIdx(0);
  }, [filtered.length, activeIdx]);

  function runCommand(cmd: Command): void {
    pushRecent(cmd.id);
    onClose();
    // Defer the actual run so the close animation can start cleanly.
    window.setTimeout(() => cmd.run(), 0);
  }

  function handleInputKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setActiveIdx((i) => Math.min(i + 1, Math.max(0, filtered.length - 1)));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setActiveIdx((i) => Math.max(0, i - 1));
    } else if (e.key === "Enter") {
      e.preventDefault();
      const cmd = filtered[activeIdx];
      if (cmd) runCommand(cmd);
    }
  }

  if (!open) return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Command palette"
      data-testid="command-palette"
      onClick={onClose}
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 80,
        // Liquid-glass overlay: backdrop blur dimming the page behind.
        // Falls back to a solid scrim on browsers without filter support
        // (Safari is fine; older Android WebViews skip the blur).
        background: "rgba(7, 9, 15, 0.78)",
        backdropFilter: "blur(8px)",
        WebkitBackdropFilter: "blur(8px)",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        paddingTop: "calc(var(--safe-top, 0px) + 12vh)",
        paddingLeft: "var(--sp-16, 16px)",
        paddingRight: "var(--sp-16, 16px)",
      }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          width: "100%",
          maxWidth: "560px",
          background: "var(--bg-elev)",
          // Thin amber glow border = "this is a command surface"
          border: "1px solid var(--accent-glow)",
          borderRadius: "14px",
          boxShadow:
            "0 0 24px -8px var(--accent-bloom), 0 18px 40px -12px rgba(0,0,0,0.7)",
          overflow: "hidden",
        }}
      >
        {/* Input row */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: "10px",
            padding: "var(--sp-12, 12px) var(--sp-16, 16px)",
            borderBottom: "1px solid var(--surface-2)",
          }}
        >
          <span
            aria-hidden
            style={{
              fontFamily: "var(--font-ui)",
              fontSize: "var(--fs-12, 12px)",
              color: "var(--accent)",
              letterSpacing: "0.18em",
              textTransform: "uppercase",
            }}
          >
            ⌬ CMD
          </span>
          <input
            ref={inputRef}
            data-testid="command-palette-input"
            type="text"
            value={query}
            onChange={(e) => {
              setQuery(e.target.value);
              setActiveIdx(0);
            }}
            onKeyDown={handleInputKeyDown}
            placeholder="Type a command…"
            aria-label="Search commands"
            style={{
              flex: 1,
              background: "transparent",
              border: "none",
              outline: "none",
              fontFamily: "var(--font-ui)",
              fontSize: "var(--fs-16, 16px)",
              color: "var(--ink)",
            }}
          />
          <span
            style={{
              fontFamily: "var(--font-ui)",
              fontSize: "var(--fs-10, 10px)",
              color: "var(--ink-dim)",
              padding: "3px 6px",
              border: "1px solid var(--surface-3)",
              borderRadius: "4px",
            }}
          >
            ESC
          </span>
        </div>

        {/* Results list */}
        <ul
          role="listbox"
          aria-label="Available commands"
          data-testid="command-palette-list"
          style={{
            listStyle: "none",
            margin: 0,
            padding: "var(--sp-4, 4px)",
            maxHeight: "60vh",
            overflowY: "auto",
          }}
        >
          {filtered.length === 0 ? (
            <li
              style={{
                padding: "var(--sp-16, 16px)",
                color: "var(--ink-dim)",
                fontFamily: "var(--font-ui)",
                fontSize: "var(--fs-12, 12px)",
                textAlign: "center",
              }}
            >
              No commands match &ldquo;{query}&rdquo;
            </li>
          ) : (
            filtered.map((cmd, i) => {
              const active = i === activeIdx;
              const Icon = cmd.icon;
              return (
                <li
                  key={cmd.id}
                  role="option"
                  aria-selected={active}
                  data-testid={`command-palette-item-${cmd.id}`}
                  onMouseEnter={() => setActiveIdx(i)}
                  onClick={() => runCommand(cmd)}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: "var(--sp-12, 12px)",
                    padding: "var(--sp-8, 8px) var(--sp-12, 12px)",
                    borderRadius: "8px",
                    background: active ? "var(--surface-2)" : "transparent",
                    cursor: "pointer",
                    fontFamily: "var(--font-ui)",
                    fontSize: "var(--fs-14, 14px)",
                    color: "var(--ink)",
                    minHeight: "44px",
                    transition: "background var(--motion-tap, 100ms ease-out)",
                  }}
                >
                  {Icon && (
                    <span
                      aria-hidden
                      style={{
                        color: active ? "var(--accent)" : "var(--ink-dim)",
                        display: "flex",
                      }}
                    >
                      <Icon size={16} />
                    </span>
                  )}
                  <span style={{ flex: 1, minWidth: 0 }}>
                    {cmd.label}
                    {cmd.hint && (
                      <span
                        style={{
                          marginLeft: "8px",
                          color: "var(--ink-dim)",
                          fontSize: "var(--fs-12, 12px)",
                        }}
                      >
                        {cmd.hint}
                      </span>
                    )}
                  </span>
                  {cmd.shortcut && (
                    <span
                      aria-hidden
                      style={{
                        fontFamily: "var(--font-ui)",
                        fontSize: "var(--fs-10, 10px)",
                        color: "var(--ink-dim)",
                        padding: "3px 6px",
                        border: "1px solid var(--surface-3)",
                        borderRadius: "4px",
                        whiteSpace: "nowrap",
                      }}
                    >
                      {cmd.shortcut}
                    </span>
                  )}
                </li>
              );
            })
          )}
        </ul>
      </div>
    </div>
  );
}

/**
 * useCommandPalette — hook that owns the open/close state + the global
 * ⌘K / Ctrl+K shortcut. Returns { open, setOpen } for parents to wire.
 *
 * Lives in this file so callers don't have to import two things.
 */
export function useCommandPalette(): {
  open: boolean;
  setOpen: (v: boolean) => void;
} {
  const [open, setOpen] = useState(false);
  useEffect(() => {
    function h(e: KeyboardEvent) {
      // ⌘K on Mac, Ctrl+K elsewhere. Don't intercept when an input
      // already has the K combination meaning (browser back to URL bar
      // is Cmd+L, so this is safe).
      const isCmdK =
        (e.metaKey || e.ctrlKey) && (e.key === "k" || e.key === "K");
      if (isCmdK) {
        e.preventDefault();
        setOpen((v) => !v);
      }
    }
    document.addEventListener("keydown", h);
    return () => document.removeEventListener("keydown", h);
  }, []);
  return { open, setOpen };
}
