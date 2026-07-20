import { render, screen } from "@testing-library/react"
import type { ReactNode } from "react"
import { beforeEach, describe, expect, it, vi } from "vitest"
import App from "@/src/components/App"
import type { WeatherResult } from "@/src/types/weather"

const reducedMotionPolicy = vi.hoisted(() => vi.fn())
const weatherSearchProperties = vi.hoisted(() => vi.fn())

vi.mock("motion/react", () => ({
  MotionConfig: ({
    children,
    reducedMotion,
  }: {
    children: ReactNode
    reducedMotion: "always" | "never" | "user"
  }) => {
    reducedMotionPolicy(reducedMotion)
    return children
  },
}))

vi.mock("@/src/components/BackgroundImage", () => ({
  default: () => null,
}))

vi.mock("@/src/components/ToggleDarkMode", () => ({
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
    reducedMotionPolicy.mockClear()
    weatherSearchProperties.mockClear()
  })

  it("applies the user’s reduced-motion preference globally", () => {
    render(<App initialCity={null} weatherResult={null} />)

    expect(reducedMotionPolicy).toHaveBeenCalledWith("user")
  })

  it("forwards server-rendered weather to the search boundary", () => {
    const weatherResult = {
      status: "success",
      temperatureKelvin: 300.15,
      description: "clear sky",
      icon: "01d",
    } satisfies WeatherResult

    render(<App initialCity="Mexico City" weatherResult={weatherResult} />)

    expect(screen.getByTestId("weather-search")).toBeInTheDocument()
    expect(weatherSearchProperties).toHaveBeenCalledWith({
      initialCity: "Mexico City",
      weatherResult,
    })
  })
})
