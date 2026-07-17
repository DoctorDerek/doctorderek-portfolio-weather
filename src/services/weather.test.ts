import { afterEach, describe, expect, it, vi } from "vitest"
import getCurrentWeather from "@/src/services/weather"
import {
  OPEN_WEATHER_MAP_SUCCESS_RESPONSE_FIXTURE,
  OPEN_WEATHER_MAP_TEST_API_KEY,
  OPEN_WEATHER_MAP_TEST_CITY,
} from "@/src/test/openWeatherMapFixtures"

describe("getCurrentWeather", () => {
  afterEach(() => {
    vi.unstubAllEnvs()
  })

  it("returns a configuration error without requesting weather", async () => {
    vi.stubEnv("OPEN_WEATHER_MAP_API_KEY", "")

    await expect(
      getCurrentWeather(OPEN_WEATHER_MAP_TEST_CITY),
    ).resolves.toEqual({
      status: "error",
      code: 500,
      message: "API key is not configured",
    })
  })

  it("maps a successful OpenWeatherMap response into application data", async () => {
    vi.stubEnv("OPEN_WEATHER_MAP_API_KEY", OPEN_WEATHER_MAP_TEST_API_KEY)

    await expect(
      getCurrentWeather(OPEN_WEATHER_MAP_TEST_CITY),
    ).resolves.toEqual({
      status: "success",
      temperatureKelvin: OPEN_WEATHER_MAP_SUCCESS_RESPONSE_FIXTURE.main.temp,
      description:
        OPEN_WEATHER_MAP_SUCCESS_RESPONSE_FIXTURE.weather[0].description,
      icon: OPEN_WEATHER_MAP_SUCCESS_RESPONSE_FIXTURE.weather[0].icon,
    })
  })
})
