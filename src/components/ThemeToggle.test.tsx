import { render, screen } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { describe, expect, it, vi } from "vitest"
import ThemeToggle from "@/src/components/ThemeToggle"

describe("ThemeToggle", () => {
  it("presents the reusable light-theme control and decorative artwork", () => {
    const { container } = render(
      <ThemeToggle isDarkTheme={false} onToggle={vi.fn()} />,
    )

    const themeToggle = screen.getByRole("button", {
      name: "Switch to dark theme",
    })
    const artwork = container.querySelector("svg")

    expect(themeToggle).toHaveClass(
      "top-4",
      "right-4",
      "theme-toggle--light",
    )
    expect(artwork).toHaveAttribute("aria-hidden", "true")
    expect(artwork).toHaveAttribute("focusable", "false")
  })

  it("presents the reusable dark-theme control", () => {
    render(<ThemeToggle isDarkTheme onToggle={vi.fn()} />)

    expect(
      screen.getByRole("button", { name: "Switch to light theme" }),
    ).toHaveClass("theme-toggle--dark")
  })

  it("delegates activation without owning application theme state", async () => {
    const user = userEvent.setup()
    const onToggle = vi.fn()
    render(<ThemeToggle isDarkTheme={false} onToggle={onToggle} />)

    await user.click(
      screen.getByRole("button", { name: "Switch to dark theme" }),
    )

    expect(onToggle).toHaveBeenCalledOnce()
  })
})
