import { render, screen } from "@testing-library/react"
import { describe, expect, it } from "vitest"
import Card from "@/src/components/Card"

describe("Card", () => {
  it("presents live content as one atomic status update", () => {
    render(<Card heading="Loading weather…" ariaLive="polite" />)

    expect(screen.getByRole("status")).toHaveAttribute("aria-live", "polite")
    expect(screen.getByRole("status")).toHaveAttribute("aria-atomic", "true")
  })

  it("uses standard typography for concise city headings", () => {
    render(<Card heading="London" />)

    expect(screen.getByRole("heading", { name: "London" })).toHaveClass(
      "text-xl",
    )
    expect(screen.getByRole("heading", { name: "London" })).not.toHaveClass(
      "text-base",
    )
  })

  it("uses compact typography without dropping long-city content", () => {
    render(
      <Card heading="Mexico City, Mexico">
        <div>Weather details</div>
      </Card>,
    )

    expect(
      screen.getByRole("heading", { name: "Mexico City, Mexico" }),
    ).toHaveClass("text-base")
    expect(
      screen.getByRole("heading", { name: "Mexico City, Mexico" }),
    ).not.toHaveClass("text-xl")
    expect(screen.getByText("Weather details")).toBeVisible()
  })
})
