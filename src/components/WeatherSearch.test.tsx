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
const motionContainerConfiguration = vi.hoisted(() => vi.fn())

type MotionButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  whileHover?: { scale: number }
  whileTap?: { scale: number }
}

type MotionContainerProps = HTMLAttributes<HTMLElement> & {
  "data-testid"?: string
  initial?: false | { opacity: number; y: number }
  animate?: { opacity: number; y: number }
  exit?: { opacity: number; y: number }
  transition?: { duration: number; ease: string }
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
        initial,
        animate,
        exit,
        transition,
        ...divProperties
      }: MotionContainerProps) => {
        motionContainerConfiguration({
          element: "div",
          testId: divProperties["data-testid"],
          initial,
          animate,
          exit,
          transition,
        })
        return <div {...divProperties}>{children}</div>
      },
      section: ({
        children,
        initial,
        animate,
        transition,
        ...sectionProperties
      }: MotionContainerProps) => {
        motionContainerConfiguration({
          element: "section",
          initial,
          animate,
          transition,
        })
        return <section {...sectionProperties}>{children}</section>
      },
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
    shouldAutoFetchIfPermitted: boolean
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
    motionContainerConfiguration.mockClear()
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

  it("uses restrained spatial feedback for workspace and forecast entry", () => {
    renderWeatherSearch({
      initialCity: "San Francisco",
      weatherResult: {
        status: "success",
        temperatureKelvin: 300.15,
        description: "clear sky",
        icon: "01d",
        location: {
          name: "San Francisco",
          stateName: "California",
          countryCode: "US",
        },
      },
    })

    expect(motionContainerConfiguration).toHaveBeenCalledWith(
      expect.objectContaining({
        element: "section",
        initial: { opacity: 0, y: 12 },
        animate: { opacity: 1, y: 0 },
      }),
    )
    expect(motionContainerConfiguration).toHaveBeenCalledWith(
      expect.objectContaining({
        element: "div",
        testId: "forecast-transition",
        initial: { opacity: 0, y: 8 },
        animate: { opacity: 1, y: 0 },
        exit: { opacity: 0, y: -4 },
      }),
    )
  })

  it("enables location auto-detect when no city is selected", () => {
    renderWeatherSearch({ initialCity: null, weatherResult: null })

    expect(
      locationWeatherButtonProperties.mock.lastCall?.[0]
        .shouldAutoFetchIfPermitted,
    ).toBe(true)
  })

  it("disables location auto-detect when a city query is active", () => {
    searchParameters.value = "city=San%20Francisco"
    renderWeatherSearch({
      initialCity: "San Francisco",
      weatherResult: {
        status: "success",
        temperatureKelvin: 300.15,
        description: "clear sky",
        icon: "01d",
        location: {
          name: "San Francisco",
          stateName: "California",
          countryCode: "US",
        },
      },
    })

    expect(
      locationWeatherButtonProperties.mock.lastCall?.[0]
        .shouldAutoFetchIfPermitted,
    ).toBe(false)
  })

  it("removes spatial workspace and forecast transitions for reduced motion", () => {
    reducedMotionPreference.value = true
    renderWeatherSearch({
      initialCity: "San Francisco",
      weatherResult: {
        status: "success",
        temperatureKelvin: 300.15,
        description: "clear sky",
        icon: "01d",
        location: {
          name: "San Francisco",
          stateName: "California",
          countryCode: "US",
        },
      },
    })

    expect(motionContainerConfiguration).toHaveBeenCalledWith(
      expect.objectContaining({ element: "section", initial: false }),
    )
    expect(motionContainerConfiguration).toHaveBeenCalledWith(
      expect.objectContaining({
        element: "div",
        testId: "forecast-transition",
        initial: false,
        exit: undefined,
      }),
    )
  })

  it("submits an accessible weather search through encoded navigation", async () => {
    const user = userEvent.setup()
    renderWeatherSearch({ initialCity: null, weatherResult: null })

    const cityInput = screen.getByRole("textbox", {
      name: "City or place",
    })

    await user.type(cityInput, "  San Francisco  ")
    await user.click(screen.getByRole("button", { name: "Search" }))

    expect(routerPush).toHaveBeenCalledOnce()
    expect(routerPush).toHaveBeenCalledWith("/?city=San%20Francisco")
  })

  it("displays search-pending status while awaiting a city weather lookup", async () => {
    const user = userEvent.setup()
    const { rerender } = renderWeatherSearch({
      initialCity: null,
      weatherResult: null,
    })
    const cityInput = screen.getByRole("textbox", { name: "City or place" })
    const submitButton = screen.getByRole("button", { name: "Search" })

    await user.type(cityInput, "San Francisco")
    await user.click(submitButton)

    expect(submitButton).toBeDisabled()
    expect(screen.getByRole("status")).toHaveTextContent(
      "Loading forecast for San Francisco...",
    )
    expect(routerPush).toHaveBeenCalledWith("/?city=San%20Francisco")

    searchParameters.value = "city=San%20Francisco"
    rerender(
      <>
        <Toaster />
        <WeatherSearch
          initialCity="San Francisco"
          weatherResult={{
            status: "success",
            temperatureKelvin: 300.15,
            description: "clear sky",
            icon: "01d",
            location: {
              name: "San Francisco",
              stateName: "California",
              countryCode: "US",
            },
          }}
        />
      </>,
    )

    expect(screen.getByRole("button", { name: "Search" })).not.toBeDisabled()
    expect(
      screen.queryByText("Loading forecast for San Francisco..."),
    ).not.toBeInTheDocument()
  })

  it("clears city search status when location weather starts loading", async () => {
    const user = userEvent.setup()
    const { rerender } = renderWeatherSearch({
      initialCity: null,
      weatherResult: null,
    })
    const cityInput = screen.getByRole("textbox", { name: "City or place" })

    await user.type(cityInput, "San Francisco")
    await user.click(screen.getByRole("button", { name: "Search" }))

    expect(screen.getByTestId("weather-search-status")).toHaveTextContent(
      "Loading forecast for San Francisco...",
    )

    const weatherResult = {
      status: "success",
      temperatureKelvin: 300.15,
      description: "clear sky",
      icon: "01d",
      location: {
        name: "San Francisco",
        stateName: "California",
        countryCode: "US",
      },
    } satisfies WeatherResult

    searchParameters.value = "city=San%20Francisco"
    rerender(
      <>
        <Toaster />
        <WeatherSearch
          initialCity="San Francisco"
          weatherResult={weatherResult}
        />
      </>,
    )

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
          initialCity="San Francisco"
          weatherResult={weatherResult}
        />
      </>,
    )

    expect(
      screen.getByRole("heading", { name: "Loading weather…" }),
    ).toBeVisible()
    expect(screen.queryByTestId("weather-search-status")).not.toBeInTheDocument()
  })

  it("uses native validity and semantic heading composition for city entry", () => {
    renderWeatherSearch({ initialCity: null, weatherResult: null })

    const cityInput = screen.getByRole("textbox", {
      name: "City or place",
    })
    const searchHeading = screen.getByRole("heading", {
      name: "Weather, right now",
    })
    const cityLabel = screen.getByText("City or place")

    expect(cityInput).toBeRequired()
    expect(cityInput).toHaveAttribute("pattern", ".*\\S.*")
    expect(cityLabel).toHaveAttribute("for", "city")
    expect(searchHeading).toHaveAttribute("id", "weather-workspace-title")
  })

  it("does not navigate for whitespace-only city input", async () => {
    const user = userEvent.setup()
    renderWeatherSearch({ initialCity: null, weatherResult: null })

    const cityInput = screen.getByRole("textbox", {
      name: "City or place",
    })

    await user.type(cityInput, "   ")
    await user.click(screen.getByRole("button", { name: "Search" }))

    expect(cityInput).toBeInvalid()
    expect(routerPush).not.toHaveBeenCalled()
  })

  it("ignores a programmatically submitted blank city", () => {
    renderWeatherSearch({ initialCity: null, weatherResult: null })
    const cityInput = screen.getByRole("textbox", {
      name: "City or place",
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
    expect(screen.queryByLabelText("Temperature")).not.toBeInTheDocument()
  })

  it("shows ephemeral location weather without placing coordinates in history", () => {
    searchParameters.value = "city=San%20Francisco"
    window.history.replaceState(null, "", "/?city=San%20Francisco")
    const { rerender } = renderWeatherSearch({
      initialCity: "San Francisco",
      weatherResult: {
        status: "success",
        temperatureKelvin: 300.15,
        description: "clear sky",
        icon: "01d",
        location: {
          name: "San Francisco",
          stateName: "California",
          countryCode: "US",
        },
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
          initialCity="San Francisco"
          weatherResult={{
            status: "success",
            temperatureKelvin: 300.15,
            description: "clear sky",
            icon: "01d",
            location: {
              name: "San Francisco",
              stateName: "California",
              countryCode: "US",
            },
          }}
        />
      </>,
    )

    expect(
      screen.getByRole("heading", { name: "Loading weather…" }),
    ).toBeVisible()
    expect(screen.queryByTestId("weather-search-status")).not.toBeInTheDocument()

    act(() => {
      locationButtonProperties.onLocationWeatherResult({
        status: "success",
        temperatureKelvin: 299.15,
        description: "few clouds",
        icon: "02d",
        location: {
          name: "SoMa",
          stateName: "California",
          countryCode: "US",
        },
      })
    })

    expect(window.location.pathname).toBe("/")
    expect(window.location.search).toBe("")
    expect(screen.getByRole("heading", { name: "SoMa" })).toBeVisible()
    expect(screen.getByText("Few Clouds")).toBeVisible()
    expect(screen.getByRole("textbox", { name: "City or place" })).toHaveValue(
      "",
    )
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
      initialCity: "San Francisco",
      weatherResult: {
        status: "success",
        temperatureKelvin: 300.15,
        description: "clear sky",
        icon: "01d",
        location: {
          name: "San Francisco",
          stateName: "California",
          countryCode: "US",
        },
      },
    })

    expect(screen.getByRole("status")).toHaveTextContent("Loading weather…")
    expect(
      screen.queryByRole("heading", { name: "San Francisco" }),
    ).not.toBeInTheDocument()
    expect(screen.getByRole("textbox", { name: "City or place" })).toHaveValue(
      "Puebla",
    )
  })

  it("restores city weather when browser history returns to a city query", () => {
    searchParameters.value = "city=San%20Francisco"
    const { rerender } = renderWeatherSearch({
      initialCity: "San Francisco",
      weatherResult: {
        status: "success",
        temperatureKelvin: 300.15,
        description: "clear sky",
        icon: "01d",
        location: {
          name: "San Francisco",
          stateName: "California",
          countryCode: "US",
        },
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
          initialCity="San Francisco"
          weatherResult={{
            status: "success",
            temperatureKelvin: 300.15,
            description: "clear sky",
            icon: "01d",
            location: {
              name: "San Francisco",
              stateName: "California",
              countryCode: "US",
            },
          }}
        />
      </>,
    )
    searchParameters.value = "city=San%20Francisco"
    rerender(
      <>
        <Toaster />
        <WeatherSearch
          initialCity="San Francisco"
          weatherResult={{
            status: "success",
            temperatureKelvin: 300.15,
            description: "clear sky",
            icon: "01d",
            location: {
              name: "San Francisco",
              stateName: "California",
              countryCode: "US",
            },
          }}
        />
      </>,
    )

    expect(screen.getByRole("heading", { name: "San Francisco" })).toBeVisible()
    expect(screen.getByText("Clear Sky")).toBeVisible()
  })
})
