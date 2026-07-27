import { render, screen } from "@testing-library/react"
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
