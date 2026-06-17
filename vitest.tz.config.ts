// vitest.tz.config.ts — R7-ROOT-3: multi-TZ-pinned test runner.
//
// Runs every `lib/**/*.tz.test.ts` under whichever timezone the parent process
// sets via TZ env. The npm scripts spawn the same file four times, each with
// a different TZ:
//
//   npm run test:tz:pt        → TZ=America/Los_Angeles (negative offset + DST)
//   npm run test:tz:tokyo     → TZ=Asia/Tokyo          (positive offset, no DST)
//   npm run test:tz:utc       → TZ=UTC                  (zero offset)
//   npm run test:tz:nepal     → TZ=Asia/Kathmandu       (+5:45, edge case)
//
//   npm run test:tz           → runs all four sequentially
//
// The TZ env var MUST be set at process start (not in-test) for V8/ICU to
// honour it — vitest fork pools inherit the parent env.
//
// Test files covered (auto-globbed):
// - lib/appliesOn.tz.test.ts   (M9a — recurrence resolution)
// - lib/dayOfYear.tz.test.ts   (R1-P2-2 — DST + NYE boundaries)
// - lib/dharma.tz.test.ts      (R7-ROOT-3 — today/dateLabel/dayNumber/isoToLocalDate)
import { defineConfig } from "vitest/config";
import react from "@vitejs/plugin-react";
import path from "node:path";

export default defineConfig({
  plugins: [react()],
  test: {
    environment: "jsdom",
    globals: true,
    setupFiles: ["./vitest.setup.ts"],
    include: ["lib/**/*.tz.test.ts"],
    exclude: ["node_modules", ".next"],
    css: false,
  },
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "."),
    },
  },
});
