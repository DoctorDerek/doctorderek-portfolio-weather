import path from "node:path"
import { defineConfig } from "vitest/config"

export default defineConfig({
  resolve: {
    alias: {
      "@": path.resolve(import.meta.dirname),
    },
  },
  test: {
    include: ["scripts/xstate-diff/**/*.test.ts"],
    coverage: {
      reportOnFailure: true,
      reportsDirectory: "coverage/xstate",
      include: ["scripts/xstate-diff/**/*.ts"],
      exclude: ["scripts/xstate-diff/xstateDiff.cli.ts"],
      reporter: ["text", "json-summary", "lcov"],
      thresholds: {
        branches: 100,
        functions: 100,
        lines: 100,
        statements: 100,
      },
    },
  },
})
