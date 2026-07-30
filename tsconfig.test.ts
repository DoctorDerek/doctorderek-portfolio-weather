import { describe, expect, it } from "vitest"
import tsconfig from "@/tsconfig.json"

describe("tsconfig", () => {
  it("rejects JavaScript inputs from the TypeScript compilation boundary", () => {
    expect(tsconfig.compilerOptions.allowJs).toBe(false)
  })
})
