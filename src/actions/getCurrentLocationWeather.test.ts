import { beforeEach, describe, expect, it, vi } from "vitest"
import { getCurrentLocationWeather } from "@/src/actions/getCurrentLocationWeather"
import type { WeatherCoordinates, WeatherResult } from "@/src/types/weather"

const getCurrentWeatherByCoordinatesMock = vi.hoisted(() => vi.fn())

vi.mock("@/src/services/weather", () => ({
  getCurrentWeatherByCoordinates: getCurrentWeatherByCoordinatesMock,
}))

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

const INVALID_WEATHER_COORDINATE_CASES = [
  { description: "a missing coordinate object", coordinates: null },
  {
    description: "a non-numeric latitude",
    coordinates: { latitude: "north", longitude: -99.13 },
  },
  {
    description: "a non-finite longitude",
    coordinates: { latitude: 19.43, longitude: Number.POSITIVE_INFINITY },
  },
  {
    description: "a latitude above its maximum",
    coordinates: { latitude: 90.01, longitude: -99.13 },
  },
  {
    description: "a latitude below its minimum",
    coordinates: { latitude: -90.01, longitude: -99.13 },
  },
  {
    description: "a longitude above its maximum",
    coordinates: { latitude: 19.43, longitude: 180.01 },
  },
  {
    description: "a longitude below its minimum",
    coordinates: { latitude: 19.43, longitude: -180.01 },
  },
] satisfies { description: string; coordinates: unknown }[]

describe("getCurrentLocationWeather", () => {
  beforeEach(() => {
    getCurrentWeatherByCoordinatesMock.mockReset()
    getCurrentWeatherByCoordinatesMock.mockResolvedValue(
      SUCCESSFUL_WEATHER_RESULT,
    )
  })

  it("rounds valid coordinates before requesting current weather", async () => {
    await expect(
      getCurrentLocationWeather({
        latitude: 19.432_608,
        longitude: -99.133_209,
      }),
    ).resolves.toEqual(SUCCESSFUL_WEATHER_RESULT)

    expect(getCurrentWeatherByCoordinatesMock).toHaveBeenCalledOnce()
    expect(getCurrentWeatherByCoordinatesMock).toHaveBeenCalledWith({
      latitude: 19.43,
      longitude: -99.13,
    })
  })

  it.each(INVALID_WEATHER_COORDINATE_CASES)(
    "rejects $description",
    async ({ coordinates }) => {
      await expect(
        getCurrentLocationWeather(coordinates as WeatherCoordinates),
      ).resolves.toEqual({
        status: "error",
        code: 400,
        message: "Location coordinates are invalid",
      })

      expect(getCurrentWeatherByCoordinatesMock).not.toHaveBeenCalled()
    },
  )
})
