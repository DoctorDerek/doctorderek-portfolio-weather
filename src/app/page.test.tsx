import { render, screen } from "@testing-library/react"
import { beforeEach, describe, expect, it, vi } from "vitest"
import Page from "@/src/app/page"
import type { WeatherResult } from "@/src/types/weather"

const getCurrentWeatherMock = vi.hoisted(() => vi.fn())

const SUCCESSFUL_WEATHER_RESULT = {
  status: "success",
  temperatureKelvin: 300.15,
  description: "clear sky",
  icon: "01d",
  location: {
    name: "Mexico City",
    stateName: "Mexico City",
    countryCode: "MX",
  },
} satisfies WeatherResult

const ERROR_WEATHER_RESULT = {
  status: "error",
  code: 404,
  message: "city not found",
} satisfies WeatherResult

vi.mock("@/src/services/weather", () => ({
  default: getCurrentWeatherMock,
}))

vi.mock("@/src/components/App", () => ({
  default: ({
    initialCity,
    weatherResult,
  }: {
    initialCity: string | null
    weatherResult: WeatherResult | null
  }) => (
    <div
      data-testid="application-boundary"
      data-city={initialCity ?? ""}
      data-weather-result={JSON.stringify(weatherResult)}
    />
  ),
}))

describe("Page", () => {
  beforeEach(() => {
    getCurrentWeatherMock.mockReset()
  })

  it("renders an empty application without requesting unselected weather", async () => {
    render(await Page({ searchParams: Promise.resolve({}) }))

    expect(getCurrentWeatherMock).not.toHaveBeenCalled()
    expect(screen.getByTestId("application-boundary")).toHaveAttribute(
      "data-city",
      "",
    )
    expect(screen.getByTestId("application-boundary")).toHaveAttribute(
      "data-weather-result",
      "null",
    )
  })

  it("requests a scalar city and forwards the successful result", async () => {
    getCurrentWeatherMock.mockResolvedValue(SUCCESSFUL_WEATHER_RESULT)

    render(
      await Page({
        searchParams: Promise.resolve({ city: "Mexico City" }),
      }),
    )

    expect(getCurrentWeatherMock).toHaveBeenCalledOnce()
    expect(getCurrentWeatherMock).toHaveBeenCalledWith("Mexico City")
    expect(screen.getByTestId("application-boundary")).toHaveAttribute(
      "data-city",
      "Mexico City",
    )
    expect(screen.getByTestId("application-boundary")).toHaveAttribute(
      "data-weather-result",
      JSON.stringify(SUCCESSFUL_WEATHER_RESULT),
    )
  })

  it("normalizes a padded direct city query before requesting weather", async () => {
    getCurrentWeatherMock.mockResolvedValue(SUCCESSFUL_WEATHER_RESULT)

    render(
      await Page({
        searchParams: Promise.resolve({ city: "  Mexico City  " }),
      }),
    )

    expect(getCurrentWeatherMock).toHaveBeenCalledOnce()
    expect(getCurrentWeatherMock).toHaveBeenCalledWith("Mexico City")
    expect(screen.getByTestId("application-boundary")).toHaveAttribute(
      "data-city",
      "Mexico City",
    )
  })

  it("does not request a whitespace-only direct city query", async () => {
    render(
      await Page({
        searchParams: Promise.resolve({ city: "   " }),
      }),
    )

    expect(getCurrentWeatherMock).not.toHaveBeenCalled()
    expect(screen.getByTestId("application-boundary")).toHaveAttribute(
      "data-city",
      "",
    )
  })

  it("uses the legacy query parameter when city is absent", async () => {
    getCurrentWeatherMock.mockResolvedValue(SUCCESSFUL_WEATHER_RESULT)

    render(
      await Page({
        searchParams: Promise.resolve({ q: "London" }),
      }),
    )

    expect(getCurrentWeatherMock).toHaveBeenCalledOnce()
    expect(getCurrentWeatherMock).toHaveBeenCalledWith("London")
    expect(screen.getByTestId("application-boundary")).toHaveAttribute(
      "data-city",
      "London",
    )
  })

  it("normalizes array-valued city queries to their first value", async () => {
    getCurrentWeatherMock.mockResolvedValue(SUCCESSFUL_WEATHER_RESULT)

    render(
      await Page({
        searchParams: Promise.resolve({
          city: ["Mexico City", "London"],
        }),
      }),
    )

    expect(getCurrentWeatherMock).toHaveBeenCalledOnce()
    expect(getCurrentWeatherMock).toHaveBeenCalledWith("Mexico City")
    expect(screen.getByTestId("application-boundary")).toHaveAttribute(
      "data-city",
      "Mexico City",
    )
  })

  it("prefers city over the legacy query and forwards errors unchanged", async () => {
    getCurrentWeatherMock.mockResolvedValue(ERROR_WEATHER_RESULT)

    render(
      await Page({
        searchParams: Promise.resolve({
          city: "Atlantis",
          q: "London",
        }),
      }),
    )

    expect(getCurrentWeatherMock).toHaveBeenCalledOnce()
    expect(getCurrentWeatherMock).toHaveBeenCalledWith("Atlantis")
    expect(screen.getByTestId("application-boundary")).toHaveAttribute(
      "data-city",
      "Atlantis",
    )
    expect(screen.getByTestId("application-boundary")).toHaveAttribute(
      "data-weather-result",
      JSON.stringify(ERROR_WEATHER_RESULT),
    )
  })
})
