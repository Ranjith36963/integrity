// vitest.tz.config.ts — M9a: timezone-pinned test runner
//
// Runs ONLY lib/appliesOn.tz.test.ts under TZ=America/Los_Angeles.
// Usage: npm run test:tz  (which sets TZ before spawning vitest)
//
// The TZ env var must be set at process start (not in-test) for V8/ICU to
// honour it. The npm script does: TZ=America/Los_Angeles vitest run --config vitest.tz.config.ts
import { defineConfig } from "vitest/config";
import react from "@vitejs/plugin-react";
import path from "node:path";

export default defineConfig({
  plugins: [react()],
  test: {
    environment: "jsdom",
    globals: true,
    setupFiles: ["./vitest.setup.ts"],
    include: ["lib/appliesOn.tz.test.ts"],
    exclude: ["node_modules", ".next"],
    css: false,
  },
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "."),
    },
  },
});
