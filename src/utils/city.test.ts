import { describe, expect, it } from "vitest"
import { normalizeCityQuery } from "@/src/utils/city"

describe("normalizeCityQuery", () => {
  it.each([undefined, null, "", "   "])(
    "returns null for an empty city value",
    (city) => {
      expect(normalizeCityQuery(city)).toBeNull()
    },
  )

  it("trims surrounding whitespace without changing city content", () => {
    expect(normalizeCityQuery("  Ciudad de México  ")).toBe(
      "Ciudad de México",
    )
  })
})
