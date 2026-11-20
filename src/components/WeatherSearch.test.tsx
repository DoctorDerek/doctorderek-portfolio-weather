import { act, fireEvent, render, screen } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import type { ButtonHTMLAttributes, HTMLAttributes } from "react"
import toast from "react-hot-toast/headless"
import { beforeEach, describe, expect, it, vi } from "vitest"
import WeatherNotices from "@/src/components/WeatherNotices"
import WeatherSearch from "@/src/components/WeatherSearch"
import type { WeatherResult } from "@/src/types/weather"

const routerPush = vi.hoisted(() => vi.fn())
const routerRefresh = vi.hoisted(() => vi.fn())
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
    },
    useReducedMotion: () => reducedMotionPreference.value,
  }
})

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: routerPush, refresh: routerRefresh }),
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
      <WeatherNotices />
      <WeatherSearch {...properties} />
    </>,
  )
}

describe("WeatherSearch", () => {
  beforeEach(() => {
    toast.remove()
    routerPush.mockClear()
    routerRefresh.mockClear()
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

  it("keeps the workspace paintable while animating forecast entry", () => {
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

    expect(screen.getByTestId("weather-workspace").tagName).toBe("SECTION")
    expect(motionContainerConfiguration).toHaveBeenCalledTimes(1)
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

  it("removes forecast entry transitions for reduced motion", () => {
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

    expect(screen.getByTestId("weather-workspace").tagName).toBe("SECTION")
    expect(motionContainerConfiguration).toHaveBeenCalledTimes(1)
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
    expect(routerPush).toHaveBeenCalledWith("/?city=San%20Francisco", {
      scroll: false,
    })
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
    expect(routerPush).toHaveBeenCalledWith("/?city=San%20Francisco", {
      scroll: false,
    })

    searchParameters.value = "city=San%20Francisco"
    rerender(
      <>
        <WeatherNotices />
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

  it.for([
    { top: -24, scroll: true },
    { top: 360, scroll: true },
    { top: 140, scroll: false },
  ])(
    "keeps the submitted search reachable when the notice reduces the viewport (top $top)",
    ({ top, scroll }, { onTestFinished }) => {
      let resize: () => void = () => {
        throw new Error("The search viewport was never observed")
      }
      const observe = vi.fn()
      const disconnect = vi.fn()
      vi.stubGlobal(
        "ResizeObserver",
        class {
          constructor(callback: () => void) {
            resize = callback
          }
          observe = observe
          disconnect = disconnect
        },
      )
      onTestFinished(() => {
        vi.unstubAllGlobals()
      })
      const wrapper = ({ children }: { children: React.ReactNode }) => (
        <div>
          <div data-search-viewport="">{children}</div>
        </div>
      )
      const view = render(
        <WeatherSearch initialCity={null} weatherResult={null} />,
        { wrapper },
      )
      const form = screen.getByTestId("weather-search-form")
      const viewport = form.closest<HTMLElement>("[data-search-viewport]")!
      const frame = viewport.parentElement!
      const scrollIntoView = vi
        .spyOn(form, "scrollIntoView")
        .mockImplementation(() => {})
      vi.spyOn(frame, "clientHeight", "get").mockReturnValue(520)
      const viewportHeight = vi
        .spyOn(viewport, "clientHeight", "get")
        .mockReturnValue(520)
      vi.spyOn(viewport, "getBoundingClientRect").mockReturnValue(
        new DOMRect(0, 0, 320, 400),
      )
      vi.spyOn(form, "getBoundingClientRect").mockReturnValue(
        new DOMRect(0, top, 320, 80),
      )
      fireEvent.change(screen.getByLabelText("City or place"), {
        target: { value: "Missing" },
      })
      fireEvent.submit(form)
      const error = {
        status: "error",
        code: 404,
        message: "City Not Found",
      } as const
      searchParameters.value = "city=Missing"
      view.rerender(<WeatherSearch initialCity="Old" weatherResult={error} />)
      expect(observe).not.toHaveBeenCalled()
      view.rerender(
        <WeatherSearch initialCity="Missing" weatherResult={null} />,
      )
      expect(observe).not.toHaveBeenCalled()
      view.rerender(
        <WeatherSearch initialCity="Missing" weatherResult={error} />,
      )
      expect(observe).toHaveBeenCalledWith(viewport)
      resize()
      expect(scrollIntoView).not.toHaveBeenCalled()
      expect(disconnect).not.toHaveBeenCalled()
      viewportHeight.mockReturnValue(400)
      resize()
      if (scroll)
        expect(scrollIntoView).toHaveBeenCalledWith({
          block: "nearest",
          behavior: "instant",
        })
      else expect(scrollIntoView).not.toHaveBeenCalled()
      expect(disconnect).toHaveBeenCalledOnce()
      view.unmount()
      expect(disconnect).toHaveBeenCalledTimes(2)
    },
  )

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
        <WeatherNotices />
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
        <WeatherNotices />
        <WeatherSearch
          initialCity="San Francisco"
          weatherResult={weatherResult}
        />
      </>,
    )

    expect(
      screen.getByRole("heading", { name: "Loading weather…" }),
    ).toBeVisible()
    expect(
      screen.queryByTestId("weather-search-status"),
    ).not.toBeInTheDocument()
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

  it("retries the selected city through the existing server route", async () => {
    searchParameters.value = "city=Atlantis"
    const user = userEvent.setup()
    const view = renderWeatherSearch({
      initialCity: "Atlantis",
      weatherResult: {
        status: "error",
        code: 503,
        message: "service unavailable",
      },
    })
    await user.click(screen.getByRole("button", { name: "Search" }))
    expect(routerRefresh).toHaveBeenCalledOnce()
    expect(routerPush).not.toHaveBeenCalled()
    expect(screen.getByRole("alert")).toHaveTextContent(
      "Error 503: Service Unavailable",
    )
    view.rerender(
      <WeatherSearch
        initialCity="Atlantis"
        weatherResult={{
          status: "success",
          temperatureKelvin: 300.15,
          description: "clear sky",
          icon: "01d",
          location: { name: "Atlantis", stateName: null, countryCode: "US" },
        }}
      />,
    )
    expect(screen.queryByRole("alert")).not.toBeInTheDocument()
    expect(screen.getByText("27 °C")).toBeVisible()
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
        <WeatherNotices />
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
    expect(
      screen.queryByTestId("weather-search-status"),
    ).not.toBeInTheDocument()

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
        <WeatherNotices />
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
        <WeatherNotices />
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
