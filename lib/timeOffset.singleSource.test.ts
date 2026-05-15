import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

// U-m1-010 (grep assertion): Timeline.tsx and NowLine.tsx must NOT hardcode the
// hour-height value 64 directly — they must import HOUR_HEIGHT_PX from lib/timeOffset.ts.
describe("U-m1-010: HOUR_HEIGHT_PX is the single source of truth (no hardcoded 64 in Timeline/NowLine)", () => {
  it("Timeline.tsx does not contain the hardcoded literal '64'", () => {
    const timelineSource = readFileSync(
      resolve(process.cwd(), "components/Timeline.tsx"),
      "utf-8",
    );
    // Check there is no raw numeric literal 64 (not part of a larger number)
    // We check for patterns like "64)" or "64," or "64;" or "= 64" or "> 64" or "< 64"
    // The import of HOUR_HEIGHT_PX is allowed; bare 64 in math is not.
    const bareMatchRegex = /(?<![0-9])64(?![0-9])/g;
    const matches = [...timelineSource.matchAll(bareMatchRegex)];
    // Allow zero instances of bare 64 — hour height must come from HOUR_HEIGHT_PX
    expect(matches.length).toBe(0);
  });

  it("NowLine.tsx does not contain the hardcoded literal '64'", () => {
    const nowLineSource = readFileSync(
      resolve(process.cwd(), "components/NowLine.tsx"),
      "utf-8",
    );
    const bareMatchRegex = /(?<![0-9])64(?![0-9])/g;
    const matches = [...nowLineSource.matchAll(bareMatchRegex)];
    expect(matches.length).toBe(0);
  });
});
