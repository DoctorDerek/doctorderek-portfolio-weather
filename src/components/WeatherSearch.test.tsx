import { act, fireEvent, render, screen } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import type { ButtonHTMLAttributes, HTMLAttributes } from "react"
import { Toaster } from "react-hot-toast"
import { beforeEach, describe, expect, it, vi } from "vitest"
import WeatherSearch from "@/src/components/WeatherSearch"
import type { WeatherResult } from "@/src/types/weather"

const routerPush = vi.hoisted(() => vi.fn())
const searchParameters = vi.hoisted(() => ({ value: "" }))
const locationWeatherButtonProperties = vi.hoisted(() => vi.fn())
const reducedMotionPreference = vi.hoisted(() => ({
  value: false as boolean | null,
}))
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
      div: ({
        children,
        initial: _initial,
        animate: _animate,
        transition: _transition,
        ...divProperties
      }: HTMLAttributes<HTMLDivElement> & {
        initial?: { y: number }
        animate?: { y: number }
        transition?: { duration: number }
      }) => <div {...divProperties}>{children}</div>,
    },
    useReducedMotion: () => reducedMotionPreference.value,
  }
})

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: routerPush }),
  useSearchParams: () => new URLSearchParams(searchParameters.value),
}))

vi.mock("@/src/components/LocationWeatherButton", () => ({
  default: (properties: {
    onLocationWeatherLoading: () => void
    onLocationWeatherResult: (weatherResult: WeatherResult) => void
    shouldReduceMotion: boolean
  }) => {
    locationWeatherButtonProperties(properties)
    return <button type="button">Use my location</button>
  },
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
    searchParameters.value = ""
    reducedMotionPreference.value = false
    motionGestureConfiguration.mockClear()
    locationWeatherButtonProperties.mockClear()
    window.history.replaceState(null, "", "/")
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

  it("treats an unresolved motion preference as motion tolerant", () => {
    reducedMotionPreference.value = null
    renderWeatherSearch({ initialCity: null, weatherResult: null })

    expect(motionGestureConfiguration).toHaveBeenLastCalledWith({
      whileHover: { scale: 1.03 },
      whileTap: { scale: 0.97 },
    })
    expect(
      locationWeatherButtonProperties.mock.lastCall?.[0].shouldReduceMotion,
    ).toBe(false)
  })

  it("submits an accessible weather search through encoded navigation", async () => {
    const user = userEvent.setup()
    renderWeatherSearch({ initialCity: null, weatherResult: null })

    const cityInput = screen.getByRole("textbox", {
      name: "Weather Search:",
    })

    await user.type(cityInput, "  Mexico City  ")
    await user.click(screen.getByRole("button", { name: "Submit" }))

    expect(routerPush).toHaveBeenCalledOnce()
    expect(routerPush).toHaveBeenCalledWith("/?city=Mexico%20City")
  })

  it("uses native validity and semantic heading composition for city entry", () => {
    renderWeatherSearch({ initialCity: null, weatherResult: null })

    const cityInput = screen.getByRole("textbox", {
      name: "Weather Search:",
    })
    const searchHeading = screen.getByRole("heading", {
      name: "Weather Search:",
    })
    const cityLabel = searchHeading.querySelector("label")

    expect(cityInput).toBeRequired()
    expect(cityInput).toHaveAttribute("pattern", ".*\\S.*")
    expect(cityLabel).toHaveAttribute("for", "city")
    expect(searchHeading).toContainElement(cityLabel)
  })

  it("does not navigate for whitespace-only city input", async () => {
    const user = userEvent.setup()
    renderWeatherSearch({ initialCity: null, weatherResult: null })

    const cityInput = screen.getByRole("textbox", {
      name: "Weather Search:",
    })

    await user.type(cityInput, "   ")
    await user.click(screen.getByRole("button", { name: "Submit" }))

    expect(cityInput).toBeInvalid()
    expect(routerPush).not.toHaveBeenCalled()
  })

  it("ignores a programmatically submitted blank city", () => {
    renderWeatherSearch({ initialCity: null, weatherResult: null })
    const cityInput = screen.getByRole("textbox", {
      name: "Weather Search:",
    })
    const searchForm = cityInput.closest("form")

    if (!searchForm) throw new Error("Weather search form was not rendered")

    fireEvent.change(cityInput, { target: { value: "   " } })
    fireEvent.submit(searchForm)

    expect(routerPush).not.toHaveBeenCalled()
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

  it("shows ephemeral location weather without placing coordinates in history", () => {
    searchParameters.value = "city=Mexico%20City"
    window.history.replaceState(null, "", "/?city=Mexico%20City")
    const { rerender } = renderWeatherSearch({
      initialCity: "Mexico City",
      weatherResult: {
        status: "success",
        temperatureKelvin: 300.15,
        description: "clear sky",
        icon: "01d",
        locationName: "Mexico City",
      },
    })
    const locationButtonProperties =
      locationWeatherButtonProperties.mock.lastCall?.[0]

    act(() => {
      locationButtonProperties.onLocationWeatherLoading()
    })
    searchParameters.value = ""
    rerender(
      <>
        <Toaster />
        <WeatherSearch
          initialCity="Mexico City"
          weatherResult={{
            status: "success",
            temperatureKelvin: 300.15,
            description: "clear sky",
            icon: "01d",
            locationName: "Mexico City",
          }}
        />
      </>,
    )
    act(() => {
      locationButtonProperties.onLocationWeatherResult({
        status: "success",
        temperatureKelvin: 299.15,
        description: "few clouds",
        icon: "02d",
        locationName: "Cuauhtémoc",
      })
    })

    expect(window.location.pathname).toBe("/")
    expect(window.location.search).toBe("")
    expect(screen.getByRole("heading", { name: "Cuauhtémoc" })).toBeVisible()
    expect(screen.getByText("Few Clouds")).toBeVisible()
    expect(
      screen.getByRole("textbox", { name: "Weather Search:" }),
    ).toHaveValue("")
  })

  it("loads location weather without rewriting an already clean URL", () => {
    renderWeatherSearch({ initialCity: null, weatherResult: null })
    const locationButtonProperties =
      locationWeatherButtonProperties.mock.lastCall?.[0]

    act(() => {
      locationButtonProperties.onLocationWeatherLoading()
    })

    expect(window.location.pathname).toBe("/")
    expect(window.location.search).toBe("")
    expect(screen.getByRole("status")).toHaveTextContent("Loading weather…")
  })

  it("does not reuse stale weather while navigation selects a new city", () => {
    searchParameters.value = "city=Puebla"
    renderWeatherSearch({
      initialCity: "Mexico City",
      weatherResult: {
        status: "success",
        temperatureKelvin: 300.15,
        description: "clear sky",
        icon: "01d",
        locationName: "Mexico City",
      },
    })

    expect(screen.getByRole("status")).toHaveTextContent("Loading weather…")
    expect(
      screen.queryByRole("heading", { name: "Mexico City" }),
    ).not.toBeInTheDocument()
    expect(
      screen.getByRole("textbox", { name: "Weather Search:" }),
    ).toHaveValue("Puebla")
  })

  it("restores city weather when browser history returns to a city query", () => {
    searchParameters.value = "city=Mexico%20City"
    const { rerender } = renderWeatherSearch({
      initialCity: "Mexico City",
      weatherResult: {
        status: "success",
        temperatureKelvin: 300.15,
        description: "clear sky",
        icon: "01d",
        locationName: "Mexico City",
      },
    })
    const locationButtonProperties =
      locationWeatherButtonProperties.mock.lastCall?.[0]

    act(() => {
      locationButtonProperties.onLocationWeatherLoading()
    })
    searchParameters.value = ""
    rerender(
      <>
        <Toaster />
        <WeatherSearch
          initialCity="Mexico City"
          weatherResult={{
            status: "success",
            temperatureKelvin: 300.15,
            description: "clear sky",
            icon: "01d",
            locationName: "Mexico City",
          }}
        />
      </>,
    )
    searchParameters.value = "city=Mexico%20City"
    rerender(
      <>
        <Toaster />
        <WeatherSearch
          initialCity="Mexico City"
          weatherResult={{
            status: "success",
            temperatureKelvin: 300.15,
            description: "clear sky",
            icon: "01d",
            locationName: "Mexico City",
          }}
        />
      </>,
    )

    expect(screen.getByRole("heading", { name: "Mexico City" })).toBeVisible()
    expect(screen.getByText("Clear Sky")).toBeVisible()
  })
})
