import { act, render, screen } from "@testing-library/react"
import { renderToString } from "react-dom/server"
import toast from "react-hot-toast"
import { beforeEach, describe, expect, it, vi } from "vitest"
import App from "@/src/components/App"
import type { WeatherResult } from "@/src/types/weather"

const weatherSearchProperties = vi.hoisted(() => vi.fn())
const dynamicImportOptions = vi.hoisted(() => vi.fn())
const dynamicImportLoader = vi.hoisted(() => vi.fn())

vi.mock("next/dynamic", () => ({
  default: (loader: () => Promise<unknown>, options: unknown) => {
    dynamicImportLoader.mockImplementation(loader)
    dynamicImportOptions(options)
    return () => null
  },
}))

vi.mock("@/src/components/BackgroundImage", () => ({
  default: () => null,
}))

vi.mock("@/src/components/WeatherSearch", () => ({
  default: (properties: {
    initialCity: string | null
    weatherResult: WeatherResult | null
  }) => {
    weatherSearchProperties(properties)
    return <div data-testid="weather-search" />
  },
}))

describe("App", () => {
  beforeEach(() => {
    weatherSearchProperties.mockClear()
  })

  it("loads the theme adapter exclusively in the browser", async () => {
    expect(dynamicImportOptions).toHaveBeenCalledOnce()
    expect(dynamicImportOptions).toHaveBeenCalledWith({ ssr: false })
    await expect(dynamicImportLoader()).resolves.toMatchObject({
      default: expect.any(Function),
    })
  })

  it("keeps the same centered toast while moving it across the desktop breakpoint", () => {
    const nativeMatchMedia = window.matchMedia
    const viewportEvents = new EventTarget()
    const desktopViewport = {
      ...window.matchMedia("(min-width: 64rem)"),
      matches: false,
      addEventListener: viewportEvents.addEventListener.bind(viewportEvents),
      removeEventListener:
        viewportEvents.removeEventListener.bind(viewportEvents),
    }
    window.matchMedia = (query) =>
      query === desktopViewport.media
        ? desktopViewport
        : nativeMatchMedia.call(window, query)

    try {
      const app = <App initialCity={null} weatherResult={null} />
      expect(renderToString(app)).toContain("data-rht-toaster")
      const { unmount } = render(app)
      act(() => {
        toast.error("City not found")
      })
      const message = screen.getByRole("status")
      const placement = message.parentElement?.parentElement
      expect(placement).toHaveStyle({ bottom: "0px", justifyContent: "center" })

      act(() => {
        desktopViewport.matches = true
        viewportEvents.dispatchEvent(new Event("change"))
      })
      expect(screen.getByRole("status")).toBe(message)
      expect(placement).toHaveStyle({ top: "0px", justifyContent: "center" })
      expect(placement?.style.bottom).toBe("")
      unmount()
    } finally {
      act(() => {
        toast.remove()
      })
      window.matchMedia = nativeMatchMedia
    }
  })

  it("forwards server-rendered weather to the search boundary", () => {
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

    render(<App initialCity="San Francisco" weatherResult={weatherResult} />)

    expect(screen.getByTestId("weather-search")).toBeInTheDocument()
    expect(weatherSearchProperties).toHaveBeenCalledWith({
      initialCity: "San Francisco",
      weatherResult,
    })
  })
})
