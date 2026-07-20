import { render, screen } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import type { ButtonHTMLAttributes, ReactNode } from "react"
import { beforeEach, describe, expect, it, vi } from "vitest"
import App from "@/src/components/App"

const routerPush = vi.hoisted(() => vi.fn())
const reducedMotionPolicy = vi.hoisted(() => vi.fn())
const reducedMotionPreference = vi.hoisted(() => ({ value: false }))
const motionGestureConfiguration = vi.hoisted(() => vi.fn())

type MotionButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  whileHover?: { scale: number }
  whileTap?: { scale: number }
}

vi.mock("motion/react", async (importOriginal) => {
  const motion = await importOriginal<typeof import("motion/react")>()

  return {
    ...motion,
    motion: {
      ...motion.motion,
      button: ({
        children,
        whileHover,
        whileTap,
        ...buttonProps
      }: MotionButtonProps) => {
        motionGestureConfiguration({ whileHover, whileTap })
        return <button {...buttonProps}>{children}</button>
      },
    },
    MotionConfig: ({
      children,
      reducedMotion,
    }: {
      children: ReactNode
      reducedMotion: "always" | "never" | "user"
    }) => {
      reducedMotionPolicy(reducedMotion)
      return children
    },
    useReducedMotion: () => reducedMotionPreference.value,
  }
})

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
    reducedMotionPolicy.mockClear()
    reducedMotionPreference.value = false
    motionGestureConfiguration.mockClear()
  })

  it("respects the user’s reduced-motion preference", () => {
    render(<App initialCity={null} weatherResult={null} />)

    expect(reducedMotionPolicy).toHaveBeenCalledWith("user")
  })

  it("provides restrained gesture feedback for motion-tolerant users", () => {
    render(<App initialCity={null} weatherResult={null} />)

    expect(motionGestureConfiguration).toHaveBeenLastCalledWith({
      whileHover: { scale: 1.03 },
      whileTap: { scale: 0.97 },
    })
  })

  it("removes gesture transforms for reduced-motion users", () => {
    reducedMotionPreference.value = true
    render(<App initialCity={null} weatherResult={null} />)

    expect(motionGestureConfiguration).toHaveBeenLastCalledWith({
      whileHover: undefined,
      whileTap: undefined,
    })
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

  it("announces API errors without presenting stale weather details", async () => {
    render(
      <App
        initialCity="Atlantis"
        weatherResult={{
          status: "error",
          code: 404,
          message: "city not found",
        }}
      />,
    )

    expect(await screen.findByRole("alert")).toHaveTextContent(
      "Error 404: City Not Found",
    )
    expect(
      screen.queryByRole("heading", { name: "Atlantis" }),
    ).not.toBeInTheDocument()
    expect(screen.queryByText("Temperature:")).not.toBeInTheDocument()
  })
})
