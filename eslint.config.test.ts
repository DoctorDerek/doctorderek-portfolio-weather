import { ESLint } from "eslint"
import { beforeAll, describe, expect, it } from "vitest"
import packageManifest from "@/package.json"

const eslint = new ESLint({ cwd: process.cwd() })
const motionAdapterPath = "src/components/LocationWeatherButton.test.tsx"

beforeAll(async () => {
  await eslint.calculateConfigForFile("src/app/page.tsx")
})

describe("TypeScript lint configuration", () => {
  it.each([
    "src/app/page.tsx",
    "src/components/LocationWeatherButton.tsx",
    "src/components/App.test.tsx",
    motionAdapterPath,
    "src/actions/getCurrentLocationWeather.ts",
    "src/services/weather.ts",
    "src/types/weather.ts",
    "src/utils/city.test.ts",
    "src/test/openWeatherMapHandlers.ts",
    "e2e/weather-search.spec.ts",
    "scripts/lintProbe.mts",
    "scripts/lintProbe.cts",
    "types.d.ts",
    "eslint.config.ts",
    "eslint.config.test.ts",
    "next.config.ts",
    "playwright.config.ts",
    "prettier.config.ts",
    "vitest.config.ts",
    "vitest.setup.ts",
  ])(
    "reports unsafe types in %s without changing advisory severity",
    async (filePath) => {
      const [result] = await eslint.lintText("export type UnsafeValue = any", {
        filePath,
      })

      expect(result.messages).toEqual([
        expect.objectContaining({
          ruleId: "@typescript-eslint/no-explicit-any",
          severity: 1,
        }),
      ])
    },
  )

  it.each([
    "src/components/LocationWeatherButton.tsx",
    motionAdapterPath,
    "e2e/weather-search.spec.ts",
    "eslint.config.ts",
  ])("still reports unused imports in %s", async (filePath) => {
    const [result] = await eslint.lintText(
      'import { useRef } from "react"\nexport const value = 1',
      { filePath },
    )

    expect(result.messages).toEqual([
      expect.objectContaining({
        ruleId: "@typescript-eslint/no-unused-vars",
        severity: 1,
      }),
    ])
  })

  it("retains React Hooks rules alongside TypeScript rules", async () => {
    const [result] = await eslint.lintText(
      'import { useState } from "react"; export default function Example({ active }: { active: boolean }) { if (active) useState(0); return null }',
      { filePath: "src/components/LocationWeatherButton.tsx" },
    )

    expect(result.messages).toEqual([
      expect.objectContaining({ ruleId: "react-hooks/rules-of-hooks" }),
    ])
  })

  it("accepts valid typed JSX", async () => {
    const [result] = await eslint.lintText(
      "export default function Example({ label }: { label: string }) { return <span>{label}</span> }",
      { filePath: "src/components/LocationWeatherButton.tsx" },
    )

    expect(result.messages).toEqual([])
  })

  it("keeps fatal parsing failures as errors", async () => {
    const [result] = await eslint.lintText("export const value =", {
      filePath: "src/services/weather.ts",
    })

    expect(result.messages).toEqual([
      expect.objectContaining({ fatal: true, severity: 2 }),
    ])
  })
})

describe("Motion adapter exception", () => {
  it("allows only the deliberately stripped animation parameters", async () => {
    const [result] = await eslint.lintText(
      "export function stripMotionProps({ whileHover: _whileHover, whileTap: _whileTap, ...buttonProperties }: { whileHover?: unknown; whileTap?: unknown; label: string }) { return buttonProperties }",
      { filePath: motionAdapterPath },
    )

    expect(result.messages).toEqual([])
    expect(await eslint.isPathIgnored(motionAdapterPath)).toBe(false)
  })

  it.each(["_unrelated", "_whileHoverExtra", "_whileTapExtra"])(
    "still reports unused parameter %s in the adapter file",
    async (parameterName) => {
      const [result] = await eslint.lintText(
        `export function example(${parameterName}: unknown) { return true }`,
        { filePath: motionAdapterPath },
      )

      expect(result.messages).toEqual([
        expect.objectContaining({
          ruleId: "@typescript-eslint/no-unused-vars",
        }),
      ])
    },
  )

  it.each([
    "src/components/LocationWeatherButton.tsx",
    "src/components/App.test.tsx",
  ])("does not exempt the same parameter names in %s", async (filePath) => {
    const [result] = await eslint.lintText(
      "export function example(_whileHover: unknown) { return true }",
      { filePath },
    )

    expect(result.messages).toEqual([
      expect.objectContaining({ ruleId: "@typescript-eslint/no-unused-vars" }),
    ])
  })

  it("does not exempt local variables with the same names", async () => {
    const [result] = await eslint.lintText(
      "const _whileHover = 1; export const value = 2",
      { filePath: motionAdapterPath },
    )

    expect(result.messages).toEqual([
      expect.objectContaining({ ruleId: "@typescript-eslint/no-unused-vars" }),
    ])
  })
})

describe("lint scope boundaries", () => {
  it("keeps the lint command rooted at the repository", () => {
    expect(packageManifest.scripts.lint).toBe("eslint .")
  })

  it.each([
    ".next/types/fixture.ts",
    "next-env.d.ts",
    "out/fixture.ts",
    "coverage/fixture.ts",
    "playwright-report/fixture.ts",
    "test-results/fixture.ts",
    "repomix-temp.private.ts",
    "reference/private.ts",
  ])("keeps generated or private file %s ignored", async (filePath) => {
    expect(await eslint.isPathIgnored(filePath)).toBe(true)
  })

  it("does not apply TypeScript import rules to JavaScript tooling", async () => {
    const [result] = await eslint.lintText('require("node:fs")', {
      filePath: "lintProbe.cjs",
    })

    expect(result.messages).toEqual([])
  })
})
