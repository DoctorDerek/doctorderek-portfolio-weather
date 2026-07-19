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
})
