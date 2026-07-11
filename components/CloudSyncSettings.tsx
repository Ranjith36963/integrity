"use client";
/**
 * components/CloudSyncSettings.tsx — M11 Step 4: the "Cloud backup" login UI.
 *
 * Renders nothing when cloud is off. Signed out → email + password sign-in
 * (first sign-in creates the account — no email round-trip, so it works with
 * the free Supabase tier and no template access). Signed in → the account
 * email + a sign-out button. Data sync itself runs in <CloudSync/>; this is
 * only the account control.
 */
import { useState } from "react";
import { useSupabaseSession } from "@/lib/useSupabaseSession";

export function CloudSyncSettings() {
  const { ready, email, configured, signInOrSignUp, signOut } =
    useSupabaseSession();
  const [addr, setAddr] = useState("");
  const [pw, setPw] = useState("");
  const [status, setStatus] = useState<"idle" | "working" | "error">("idle");
  const [err, setErr] = useState<string | null>(null);

  if (!configured) return null;

  async function handleSubmit() {
    if (!addr.trim() || pw.length < 6) return;
    setStatus("working");
    setErr(null);
    const res = await signInOrSignUp(addr, pw);
    // On success, the auth listener flips `email` and this section re-renders
    // to the signed-in state; no extra work here.
    if (!res.ok) {
      setStatus("error");
      setErr(res.error ?? "Could not sign in — try again.");
    }
  }

  const heading = (
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
      Cloud backup
    </h3>
  );

  return (
    <section
      data-testid="settings-cloud-sync"
      style={{ display: "flex", flexDirection: "column", gap: "8px" }}
    >
      {heading}

      {!ready ? (
        <p style={{ color: "var(--ink-dim)", fontSize: "var(--fs-12, 12px)" }}>
          Checking…
        </p>
      ) : email ? (
        <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
          <p
            data-testid="cloud-backed-up"
            style={{
              color: "var(--ink)",
              fontSize: "var(--fs-14, 14px)",
              margin: 0,
            }}
          >
            <span style={{ color: "var(--accent)" }}>✓</span> You&rsquo;re
            signed in as <strong>{email}</strong>. Your data is backed up to
            this Gmail.
          </p>
          <button
            type="button"
            data-testid="cloud-sign-out"
            onClick={() => void signOut()}
            style={{
              alignSelf: "flex-start",
              background: "transparent",
              border: "none",
              color: "var(--ink-dim)",
              fontFamily: "var(--font-ui)",
              fontSize: "var(--fs-12, 12px)",
              textDecoration: "underline",
              cursor: "pointer",
              padding: 0,
            }}
          >
            Sign out
          </button>
        </div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
          <p
            style={{ color: "var(--ink-dim)", fontSize: "var(--fs-12, 12px)" }}
          >
            Email + a password (6+ characters) to back up your data and sync it
            across your phones. New here? This creates your account.
          </p>
          <input
            type="email"
            inputMode="email"
            autoComplete="email"
            placeholder="you@email.com"
            aria-label="Email for cloud backup"
            value={addr}
            onChange={(e) => setAddr(e.target.value)}
            style={fieldStyle}
          />
          <input
            type="password"
            autoComplete="current-password"
            placeholder="password"
            aria-label="Password for cloud backup"
            data-testid="cloud-password"
            value={pw}
            onChange={(e) => setPw(e.target.value)}
            style={fieldStyle}
          />
          <button
            type="button"
            data-testid="cloud-submit"
            disabled={status === "working" || !addr.trim() || pw.length < 6}
            onClick={() => void handleSubmit()}
            style={
              status === "working" || !addr.trim() || pw.length < 6
                ? {
                    ...secondaryBtn,
                    color: "var(--ink-dim)",
                    cursor: "default",
                  }
                : secondaryBtn
            }
          >
            {status === "working" ? "Signing in…" : "Sign in & back up"}
          </button>
          {status === "error" && err && (
            <p
              role="alert"
              style={{ color: "#f87171", fontSize: "var(--fs-12, 12px)" }}
            >
              {err}
            </p>
          )}
        </div>
      )}
    </section>
  );
}

const fieldStyle: React.CSSProperties = {
  height: "48px",
  borderRadius: "8px",
  border: "1px solid var(--surface-2)",
  background: "var(--surface-1)",
  color: "var(--ink)",
  padding: "0 12px",
  fontFamily: "var(--font-ui)",
  fontSize: "var(--fs-14, 14px)",
};

const secondaryBtn: React.CSSProperties = {
  height: "48px",
  borderRadius: "8px",
  border: "1px solid var(--surface-2)",
  background: "var(--surface-1)",
  color: "var(--ink)",
  fontFamily: "var(--font-ui)",
  fontSize: "var(--fs-14, 14px)",
  cursor: "pointer",
};
