import { render, screen } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import type { ButtonHTMLAttributes } from "react"
import { Toaster } from "react-hot-toast"
import { beforeEach, describe, expect, it, vi } from "vitest"
import WeatherSearch from "@/src/components/WeatherSearch"

const routerPush = vi.hoisted(() => vi.fn())
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
        ...buttonProperties
      }: MotionButtonProps) => {
        motionGestureConfiguration({ whileHover, whileTap })
        return <button {...buttonProperties}>{children}</button>
      },
    },
    useReducedMotion: () => reducedMotionPreference.value,
  }
})

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: routerPush }),
}))

function renderWeatherSearch(
  properties: React.ComponentProps<typeof WeatherSearch>,
) {
  return render(
    <>
      <Toaster />
      <WeatherSearch {...properties} />
    </>,
  )
}

describe("WeatherSearch", () => {
  beforeEach(() => {
    routerPush.mockClear()
    reducedMotionPreference.value = false
    motionGestureConfiguration.mockClear()
  })

  it("provides restrained gesture feedback for motion-tolerant users", () => {
    renderWeatherSearch({ initialCity: null, weatherResult: null })

    expect(motionGestureConfiguration).toHaveBeenLastCalledWith({
      whileHover: { scale: 1.03 },
      whileTap: { scale: 0.97 },
    })
  })

  it("removes gesture transforms for reduced-motion users", () => {
    reducedMotionPreference.value = true
    renderWeatherSearch({ initialCity: null, weatherResult: null })

    expect(motionGestureConfiguration).toHaveBeenLastCalledWith({
      whileHover: undefined,
      whileTap: undefined,
    })
  })

  it("submits an accessible weather search through encoded navigation", async () => {
    const user = userEvent.setup()
    renderWeatherSearch({ initialCity: null, weatherResult: null })

    const cityInput = screen.getByRole("textbox", {
      name: "Weather Search:",
    })

    await user.type(cityInput, "Mexico City")
    await user.click(screen.getByRole("button", { name: "Submit" }))

    expect(routerPush).toHaveBeenCalledOnce()
    expect(routerPush).toHaveBeenCalledWith("/?city=Mexico%20City")
  })

  it("announces API errors without presenting stale weather details", async () => {
    renderWeatherSearch({
      initialCity: "Atlantis",
      weatherResult: {
        status: "error",
        code: 404,
        message: "city not found",
      },
    })

    expect(await screen.findByRole("alert")).toHaveTextContent(
      "Error 404: City Not Found",
    )
    expect(
      screen.queryByRole("heading", { name: "Atlantis" }),
    ).not.toBeInTheDocument()
    expect(screen.queryByText("Temperature:")).not.toBeInTheDocument()
  })
})
