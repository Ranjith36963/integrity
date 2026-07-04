"use client";
/**
 * components/CloudSyncSettings.tsx — M11 Step 4: the "Cloud backup" login UI.
 *
 * Renders nothing when cloud is off. Signed out → email + magic-link button.
 * Signed in → the account email + a sign-out button. Data sync itself runs in
 * <CloudSync/>; this is only the account control.
 */
import { useState } from "react";
import { useSupabaseSession } from "@/lib/useSupabaseSession";

export function CloudSyncSettings() {
  const { ready, email, configured, signInWithEmail, verifyCode, signOut } =
    useSupabaseSession();
  const [addr, setAddr] = useState("");
  const [code, setCode] = useState("");
  const [status, setStatus] = useState<
    "idle" | "sending" | "sent" | "verifying" | "error"
  >("idle");
  const [err, setErr] = useState<string | null>(null);

  if (!configured) return null;

  async function handleSend() {
    if (!addr.trim()) return;
    setStatus("sending");
    setErr(null);
    const res = await signInWithEmail(addr);
    if (res.ok) {
      setStatus("sent");
    } else {
      setStatus("error");
      setErr(res.error ?? "Could not send the code.");
    }
  }

  async function handleVerify() {
    if (!code.trim()) return;
    setStatus("verifying");
    setErr(null);
    const res = await verifyCode(addr, code);
    // On success, the auth listener flips `email` and this section re-renders
    // to the signed-in state; no extra work here.
    if (!res.ok) {
      setStatus("sent");
      setErr(res.error ?? "That code didn't work — check it and try again.");
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
      ) : status === "sent" || status === "verifying" ? (
        <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
          <p
            style={{ color: "var(--ink-dim)", fontSize: "var(--fs-12, 12px)" }}
          >
            Enter the 6-digit code we emailed to <strong>{addr}</strong>.
          </p>
          <input
            type="text"
            inputMode="numeric"
            autoComplete="one-time-code"
            placeholder="123456"
            aria-label="6-digit code"
            data-testid="cloud-code"
            value={code}
            onChange={(e) => setCode(e.target.value)}
            style={{
              height: "48px",
              borderRadius: "8px",
              border: "1px solid var(--surface-2)",
              background: "var(--surface-1)",
              color: "var(--ink)",
              padding: "0 12px",
              fontFamily: "var(--font-ui)",
              fontSize: "var(--fs-14, 14px)",
              letterSpacing: "0.3em",
            }}
          />
          <button
            type="button"
            data-testid="cloud-verify-code"
            disabled={status === "verifying" || !code.trim()}
            onClick={() => void handleVerify()}
            style={{
              ...secondaryBtn,
              opacity: status === "verifying" || !code.trim() ? 0.5 : 1,
            }}
          >
            {status === "verifying" ? "Verifying…" : "Verify & back up"}
          </button>
          <button
            type="button"
            onClick={() => {
              setStatus("idle");
              setCode("");
              setErr(null);
            }}
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
            Use a different email
          </button>
          {err && (
            <p
              role="alert"
              style={{ color: "#f87171", fontSize: "var(--fs-12, 12px)" }}
            >
              {err}
            </p>
          )}
        </div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
          <p
            style={{ color: "var(--ink-dim)", fontSize: "var(--fs-12, 12px)" }}
          >
            Sign in to back up your data and sync it across your phones.
          </p>
          <input
            type="email"
            inputMode="email"
            autoComplete="email"
            placeholder="you@email.com"
            aria-label="Email for cloud backup"
            value={addr}
            onChange={(e) => setAddr(e.target.value)}
            style={{
              height: "48px",
              borderRadius: "8px",
              border: "1px solid var(--surface-2)",
              background: "var(--surface-1)",
              color: "var(--ink)",
              padding: "0 12px",
              fontFamily: "var(--font-ui)",
              fontSize: "var(--fs-14, 14px)",
            }}
          />
          <button
            type="button"
            data-testid="cloud-send-link"
            disabled={status === "sending" || !addr.trim()}
            onClick={() => void handleSend()}
            style={{
              ...secondaryBtn,
              opacity: status === "sending" || !addr.trim() ? 0.5 : 1,
            }}
          >
            {status === "sending" ? "Sending…" : "Email me a code"}
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
