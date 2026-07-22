import { render, screen, within } from "@testing-library/react"
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
  location: {
    name: TEST_CITY,
    stateName: "Mexico City",
    countryCode: "MX",
  },
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

    const loadingStatus = screen.getByRole("status")

    expect(loadingStatus).toHaveAttribute("aria-live", "polite")
    expect(loadingStatus).toHaveAttribute("aria-atomic", "true")
    expect(
      screen.getByRole("heading", { name: "Loading weather…" }),
    ).toBeVisible()
  })

  it("presents normalized weather details in Fahrenheit and Celsius", () => {
    render(
      <CityWeather
        city={TEST_CITY}
        weatherResult={SUCCESSFUL_WEATHER_RESULT}
      />,
    )

    expect(screen.getByRole("heading", { name: TEST_CITY })).toBeVisible()
    const locationDetails = screen.getByLabelText("Location details")

    expect(within(locationDetails).getByText("State or region")).toBeVisible()
    expect(within(locationDetails).getByText("Mexico City")).toBeVisible()
    expect(within(locationDetails).getByText("Country")).toBeVisible()
    expect(within(locationDetails).getByText("Mexico")).toBeVisible()
    expect(screen.getByText("Clear Sky")).toBeVisible()
    expect(screen.getByText("81 °F")).toBeVisible()
    expect(screen.getByText("27 °C")).toBeVisible()
    expect(screen.getByRole("img", { name: "clear sky" })).toBeVisible()
    expect(screen.getByRole("status")).toHaveAttribute("aria-live", "polite")
    expect(screen.getByRole("status")).toHaveAttribute("aria-atomic", "true")
  })

  it("presents country identity when a state is unavailable", () => {
    render(
      <CityWeather
        city="London"
        weatherResult={{
          ...SUCCESSFUL_WEATHER_RESULT,
          location: {
            name: "London",
            stateName: null,
            countryCode: "gb",
          },
        }}
      />,
    )

    const locationDetails = screen.getByLabelText("Location details")

    expect(
      within(locationDetails).queryByText("State or region"),
    ).not.toBeInTheDocument()
    expect(within(locationDetails).getByText("United Kingdom")).toBeVisible()
  })
})
