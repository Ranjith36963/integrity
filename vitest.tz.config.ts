// vitest.tz.config.ts — M9a: timezone-pinned test runner
//
// Runs TZ-pinned test files under TZ=America/Los_Angeles.
// Usage: npm run test:tz  (which sets TZ before spawning vitest)
//
// The TZ env var must be set at process start (not in-test) for V8/ICU to
// honour it. The npm script does: TZ=America/Los_Angeles vitest run --config vitest.tz.config.ts
//
// Included files:
// - lib/appliesOn.tz.test.ts (M9a — recurrence resolution)
// - lib/dayOfYear.tz.test.ts (R1-P2-2 M1 hardening — DST + NYE boundaries)
import { defineConfig } from "vitest/config";
import react from "@vitejs/plugin-react";
import path from "node:path";

export default defineConfig({
  plugins: [react()],
  test: {
    environment: "jsdom",
    globals: true,
    setupFiles: ["./vitest.setup.ts"],
    include: ["lib/appliesOn.tz.test.ts", "lib/dayOfYear.tz.test.ts"],
    exclude: ["node_modules", ".next"],
    css: false,
  },
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "."),
    },
  },
});
