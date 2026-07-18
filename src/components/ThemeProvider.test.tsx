import { render, screen } from "@testing-library/react"
import type { ThemeProviderProps } from "next-themes"
import { describe, expect, it, vi } from "vitest"
import ThemeProvider from "@/src/components/ThemeProvider"

vi.mock("next-themes", () => ({
  ThemeProvider: ({ attribute, children }: ThemeProviderProps) => (
    <div
      data-testid="theme-provider"
      data-theme-attribute={
        Array.isArray(attribute) ? attribute.join(" ") : attribute
      }
    >
      {children}
    </div>
  ),
}))

describe("ThemeProvider", () => {
  it("owns Tailwind theme state through the document class", () => {
    render(
      <ThemeProvider>
        <div>Weather application</div>
      </ThemeProvider>,
    )

    expect(screen.getByTestId("theme-provider")).toHaveAttribute(
      "data-theme-attribute",
      "class",
    )
    expect(screen.getByText("Weather application")).toBeVisible()
  })
})
