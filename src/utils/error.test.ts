import { describe, expect, it } from "vitest"
import { getErrorMessage } from "@/src/utils/error"

describe("getErrorMessage", () => {
  it("preserves messages from typed error values", () => {
    expect(getErrorMessage(new Error("Weather request failed"))).toBe(
      "Weather request failed",
    )
    expect(getErrorMessage({ message: "City not found" })).toBe(
      "City not found",
    )
  })

  it("serializes unknown values without string messages", () => {
    expect(getErrorMessage("Network unavailable")).toBe('"Network unavailable"')
    expect(getErrorMessage(null)).toBe("null")
    expect(getErrorMessage({ code: 500 })).toBe('{"code":500}')
    expect(getErrorMessage({ message: 500 })).toBe('{"message":500}')
  })

  it("falls back to string coercion when serialization fails", () => {
    const circularValue: { self?: unknown } = {}
    circularValue.self = circularValue

    expect(getErrorMessage(circularValue)).toBe("[object Object]")
  })
})
