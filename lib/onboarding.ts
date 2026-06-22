/**
 * lib/onboarding.ts — first-visit detection.
 *
 * SEPARATE from AppState: persisting onboarding state inside AppState would
 * (a) require a schema migration on every existing user and (b) leak into
 * the 40+ BuildingClient tests that already control AppState. A standalone
 * localStorage key keeps the concern isolated; tests can opt in/out by
 * setting the key directly in their setup.
 *
 * Storage key: "dharma:onboarding-shown" → "true" once dismissed; absent
 * otherwise. SSR-safe: returns true (skip Welcome) when window is absent.
 */

const KEY = "dharma:onboarding-shown";
const PERSISTED_STATE_KEY = "dharma:v1";

export function hasSeenOnboarding(): boolean {
  if (typeof window === "undefined") return true; // SSR: don't flash Welcome
  try {
    return window.localStorage.getItem(KEY) === "true";
  } catch {
    return true; // localStorage throwing → don't block the app on Welcome
  }
}

export function markOnboardingShown(): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(KEY, "true");
  } catch {
    /* no-op on quota / private-mode failures */
  }
}

/**
 * Returns true when the user has prior app state on disk. Used by
 * BuildingClient to skip the Welcome overlay during the two-pass
 * usePersistedState hydration — checking the live `state` prop would
 * race because pass 1 always returns an empty default state. Checking
 * the storage key directly is synchronous and pre-hydration-safe.
 *
 * The key matches lib/persist.ts (STORAGE_KEY = "dharma:v1"). If that
 * constant ever changes, this must too.
 */
export function hasPersistedState(): boolean {
  if (typeof window === "undefined") return true;
  try {
    return window.localStorage.getItem(PERSISTED_STATE_KEY) !== null;
  } catch {
    return true;
  }
}
