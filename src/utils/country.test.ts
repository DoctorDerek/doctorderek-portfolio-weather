import { afterEach, describe, expect, it, vi } from "vitest"
import { getCountryName } from "@/src/utils/country"

describe("getCountryName", () => {
  afterEach(() => {
    vi.restoreAllMocks()
  })

  it("presents a normalized English country name", () => {
    expect(getCountryName("mx")).toBe("Mexico")
  })

  it("falls back to the normalized code when a region name is unavailable", () => {
    vi.spyOn(Intl.DisplayNames.prototype, "of").mockReturnValueOnce(undefined)

    expect(getCountryName("mx")).toBe("MX")
  })
})
