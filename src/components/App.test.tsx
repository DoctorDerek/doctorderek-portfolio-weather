import { render, screen } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { beforeEach, describe, expect, it, vi } from "vitest"
import App from "@/src/components/App"

const routerPush = vi.hoisted(() => vi.fn())

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: routerPush }),
}))

vi.mock("@/src/components/BackgroundImage", () => ({
  default: () => null,
}))

vi.mock("@/src/components/ToggleDarkMode", () => ({
  default: () => null,
}))

describe("App", () => {
  beforeEach(() => {
    routerPush.mockClear()
  })

  it("submits an accessible weather search through encoded client navigation", async () => {
    const user = userEvent.setup()
    render(<App initialCity={null} weatherResult={null} />)

    const cityInput = screen.getByRole("textbox", {
      name: "Weather Search:",
    })

    await user.type(cityInput, "Mexico City")
    await user.click(screen.getByRole("button", { name: "Submit" }))

    expect(routerPush).toHaveBeenCalledOnce()
    expect(routerPush).toHaveBeenCalledWith("/?city=Mexico%20City")
  })
})
