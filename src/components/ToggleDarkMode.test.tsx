import { render, screen } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { beforeEach, describe, expect, it, vi } from "vitest"
import ToggleDarkMode from "@/src/components/ToggleDarkMode"

const themeState = vi.hoisted(() => ({
  resolvedTheme: "light" as "dark" | "light",
  setTheme: vi.fn(),
}))

vi.mock("next-themes", () => ({
  useTheme: () => themeState,
}))

describe("ToggleDarkMode", () => {
  beforeEach(() => {
    themeState.resolvedTheme = "light"
    themeState.setTheme.mockClear()
  })

  it("requests dark mode through the accessible light-theme control", async () => {
    const user = userEvent.setup()
    render(<ToggleDarkMode />)

    const themeToggle = await screen.findByRole("button", {
      name: "Switch to dark theme",
    })

    expect(themeToggle).toHaveClass("theme-toggle--light")

    await user.click(themeToggle)

    expect(themeState.setTheme).toHaveBeenCalledOnce()
    expect(themeState.setTheme).toHaveBeenCalledWith("dark")
  })

  it("requests light mode through the accessible dark-theme control", async () => {
    const user = userEvent.setup()
    themeState.resolvedTheme = "dark"
    render(<ToggleDarkMode />)

    const themeToggle = await screen.findByRole("button", {
      name: "Switch to light theme",
    })

    expect(themeToggle).toHaveClass("theme-toggle--dark")

    await user.click(themeToggle)

    expect(themeState.setTheme).toHaveBeenCalledOnce()
    expect(themeState.setTheme).toHaveBeenCalledWith("light")
  })
})
