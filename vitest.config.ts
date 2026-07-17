import path from "path"
import react from "@vitejs/plugin-react"
import { defineConfig } from "vitest/config"

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./"),
      "server-only": path.resolve(__dirname, "./src/test/serverOnly.ts"),
    },
  },
  test: {
    environment: "happy-dom",
    include: ["**/*.test.tsx", "**/*.test.ts"],
    setupFiles: ["./vitest.setup.ts"],
  },
})
