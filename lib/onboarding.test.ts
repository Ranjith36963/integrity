/**
 * lib/onboarding.test.ts — localStorage flag helpers.
 */
import { describe, it, expect, beforeEach } from "vitest";
import { hasSeenOnboarding, markOnboardingShown } from "./onboarding";

describe("onboarding", () => {
  beforeEach(() => {
    window.localStorage.clear();
  });

  it("returns false when the flag is absent", () => {
    expect(hasSeenOnboarding()).toBe(false);
  });

  it("returns true after markOnboardingShown", () => {
    markOnboardingShown();
    expect(hasSeenOnboarding()).toBe(true);
  });

  it("uses the namespaced storage key 'dharma:onboarding-shown'", () => {
    markOnboardingShown();
    expect(window.localStorage.getItem("dharma:onboarding-shown")).toBe("true");
  });
});
