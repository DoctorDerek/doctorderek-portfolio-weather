import { render, screen } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { beforeEach, describe, expect, it, vi } from "vitest"
import ToggleDarkMode from "@/src/components/ToggleDarkMode"

const themeState = vi.hoisted(() => ({
  resolvedTheme: "light" as "dark" | "light" | undefined,
  theme: "system" as "system" | "light" | "dark" | undefined,
  setTheme: vi.fn(),
}))

vi.mock("next-themes", () => ({
  useTheme: () => themeState,
}))

describe("ToggleDarkMode", () => {
  beforeEach(() => {
    themeState.resolvedTheme = "light"
    themeState.theme = "system"
    themeState.setTheme.mockClear()
  })

  it("requests dark mode through the accessible light-theme control", async () => {
    const user = userEvent.setup()
    render(<ToggleDarkMode />)

    const themeToggle = screen.getByRole("button", {
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

    const themeToggle = screen.getByRole("button", {
      name: "Switch to light theme",
    })

    expect(themeToggle).toHaveClass("theme-toggle--dark")

    await user.click(themeToggle)

    expect(themeState.setTheme).toHaveBeenCalledOnce()
    expect(themeState.setTheme).toHaveBeenCalledWith("light")
  })

  it("preserves the fixed top-right placement", () => {
    render(<ToggleDarkMode />)

    expect(
      screen.getByRole("button", { name: "Switch to dark theme" }),
    ).toHaveClass("fixed")
  })

  it("falls back to resolved system theme when theme mode is system", async () => {
    themeState.theme = "system"
    themeState.resolvedTheme = "dark"
    render(<ToggleDarkMode />)

    const themeToggle = screen.getByRole("button", {
      name: "Switch to light theme",
    })
    const user = userEvent.setup()

    await user.click(themeToggle)

    expect(themeState.setTheme).toHaveBeenCalledOnce()
    expect(themeState.setTheme).toHaveBeenCalledWith("light")
  })

  it("does not render before theme resolves to a concrete value", () => {
    themeState.resolvedTheme = undefined

    render(<ToggleDarkMode />)

    expect(
      screen.queryByRole("button", { name: "Switch to dark theme" }),
    ).not.toBeInTheDocument()
  })
})
