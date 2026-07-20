import { render, screen } from "@testing-library/react"
import type { ImageProps } from "next/image"
import { describe, expect, it, vi } from "vitest"
import CityWeather from "@/src/components/CityWeather"
import type { WeatherResult } from "@/src/types/weather"

const TEST_CITY = "Mexico City"

const SUCCESSFUL_WEATHER_RESULT = {
  status: "success",
  temperatureKelvin: 300.15,
  description: "clear sky",
  icon: "01d",
} satisfies WeatherResult

vi.mock("next/image", async () => {
  const { createElement } = await import("react")

  return {
    default: ({ alt, src }: ImageProps) =>
      createElement("img", {
        alt,
        src: typeof src === "string" ? src : undefined,
      }),
  }
})

describe("CityWeather", () => {
  it("announces the loading state without interrupting the user", () => {
    render(<CityWeather city={TEST_CITY} weatherResult={null} />)

    expect(
      screen
        .getByRole("heading", { name: "...loading" })
        .closest('[aria-live="polite"]'),
    ).toBeInTheDocument()
  })

  it("presents normalized weather details in Fahrenheit and Celsius", () => {
    render(
      <CityWeather
        city={TEST_CITY}
        weatherResult={SUCCESSFUL_WEATHER_RESULT}
      />,
    )

    expect(screen.getByRole("heading", { name: TEST_CITY })).toBeVisible()
    expect(screen.getByText("Clear Sky")).toBeVisible()
    expect(screen.getByText("81 °F")).toBeVisible()
    expect(screen.getByText("27 °C")).toBeVisible()
    expect(screen.getByRole("img", { name: "clear sky" })).toBeVisible()
  })
})
