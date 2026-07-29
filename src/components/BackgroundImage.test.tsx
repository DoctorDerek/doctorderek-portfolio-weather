import { render, screen } from "@testing-library/react"
import type { ImageProps } from "next/image"
import { describe, expect, it, vi } from "vitest"
import BackgroundImage from "@/src/components/BackgroundImage"

vi.mock("next/image", async () => {
  const { createElement } = await import("react")

  return {
    default: ({ alt, preload, priority, sizes }: ImageProps) =>
      createElement("img", {
        alt,
        "data-preload": preload ? "true" : undefined,
        "data-priority": priority ? "true" : undefined,
        sizes,
      }),
  }
})

describe("BackgroundImage", () => {
  it("keeps the decorative backdrop out of the accessibility tree", () => {
    const { container } = render(<BackgroundImage />)

    expect(container.querySelector("img")).toHaveAttribute("alt", "")
    expect(screen.queryByRole("img")).not.toBeInTheDocument()
  })

  it("preloads the full-viewport responsive source without deprecated priority", () => {
    const { container } = render(<BackgroundImage />)
    const backgroundImage = container.querySelector("img")

    expect(backgroundImage).toHaveAttribute("data-preload", "true")
    expect(backgroundImage).toHaveAttribute("sizes", "100vw")
    expect(backgroundImage).not.toHaveAttribute("data-priority")
  })
})
