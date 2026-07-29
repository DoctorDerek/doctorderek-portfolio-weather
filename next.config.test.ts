import { describe, expect, it } from "vitest"
import nextConfig from "@/next.config"

describe("nextConfig", () => {
  it("allows image optimization only for content-hashed local media", () => {
    expect(nextConfig.images?.localPatterns).toEqual([
      {
        pathname: "/_next/static/media/**",
        search: "",
      },
    ])
  })

  it("does not expose a remote image optimizer source", () => {
    expect(nextConfig.images?.remotePatterns).toBeUndefined()
  })
})
