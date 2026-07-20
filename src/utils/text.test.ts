import { describe, expect, it } from "vitest"
import { upperCaseFirstLetterOfEachWord } from "@/src/utils/text"

describe("upperCaseFirstLetterOfEachWord", () => {
  it("capitalizes each word in a weather description", () => {
    expect(upperCaseFirstLetterOfEachWord("clear sky")).toBe("Clear Sky")
    expect(upperCaseFirstLetterOfEachWord("light intensity drizzle")).toBe(
      "Light Intensity Drizzle",
    )
  })

  it("returns empty display copy when no description is available", () => {
    expect(upperCaseFirstLetterOfEachWord()).toBe("")
    expect(upperCaseFirstLetterOfEachWord("")).toBe("")
  })
})
