import { render, screen } from "@testing-library/react"
import type { ImageProps } from "next/image"
import { describe, expect, it, vi } from "vitest"
import BackgroundImage from "@/src/components/BackgroundImage"

vi.mock("next/image", async () => {
  const { createElement } = await import("react")

  return {
    default: ({ alt }: ImageProps) => createElement("img", { alt }),
  }
})

describe("BackgroundImage", () => {
  it("keeps the decorative backdrop out of the accessibility tree", () => {
    const { container } = render(<BackgroundImage />)

    expect(container.querySelector("img")).toHaveAttribute("alt", "")
    expect(screen.queryByRole("img")).not.toBeInTheDocument()
  })
})
