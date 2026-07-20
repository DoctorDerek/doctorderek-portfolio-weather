import { http, HttpResponse } from "msw"
import { afterEach, describe, expect, it, vi } from "vitest"
import getCurrentWeather, {
  getCurrentWeatherByCoordinates,
} from "@/src/services/weather"
import { OPEN_WEATHER_MAP_CURRENT_WEATHER_URL } from "@/src/services/weatherConfig"
import mswServer from "@/src/test/mswServer"
import {
  OPEN_WEATHER_MAP_ERROR_RESPONSE_FIXTURE,
  OPEN_WEATHER_MAP_SUCCESS_RESPONSE_FIXTURE,
  OPEN_WEATHER_MAP_TEST_API_KEY,
  OPEN_WEATHER_MAP_TEST_CITY,
  OPEN_WEATHER_MAP_TEST_COORDINATES,
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
      locationName: OPEN_WEATHER_MAP_SUCCESS_RESPONSE_FIXTURE.name,
    })
  })

  it("requests current weather through latitude and longitude", async () => {
    vi.stubEnv("OPEN_WEATHER_MAP_API_KEY", OPEN_WEATHER_MAP_TEST_API_KEY)

    await expect(
      getCurrentWeatherByCoordinates(OPEN_WEATHER_MAP_TEST_COORDINATES),
    ).resolves.toEqual({
      status: "success",
      temperatureKelvin: OPEN_WEATHER_MAP_SUCCESS_RESPONSE_FIXTURE.main.temp,
      description:
        OPEN_WEATHER_MAP_SUCCESS_RESPONSE_FIXTURE.weather[0].description,
      icon: OPEN_WEATHER_MAP_SUCCESS_RESPONSE_FIXTURE.weather[0].icon,
      locationName: OPEN_WEATHER_MAP_SUCCESS_RESPONSE_FIXTURE.name,
    })
  })

  it("uses a stable heading when coordinate weather has no place name", async () => {
    vi.stubEnv("OPEN_WEATHER_MAP_API_KEY", OPEN_WEATHER_MAP_TEST_API_KEY)
    mswServer.use(
      http.get(OPEN_WEATHER_MAP_CURRENT_WEATHER_URL, () =>
        HttpResponse.json({
          ...OPEN_WEATHER_MAP_SUCCESS_RESPONSE_FIXTURE,
          name: "",
        }),
      ),
    )

    await expect(
      getCurrentWeatherByCoordinates(OPEN_WEATHER_MAP_TEST_COORDINATES),
    ).resolves.toMatchObject({
      status: "success",
      locationName: "Current location",
    })
  })

  it("preserves upstream API error status and messaging", async () => {
    vi.stubEnv("OPEN_WEATHER_MAP_API_KEY", OPEN_WEATHER_MAP_TEST_API_KEY)
    mswServer.use(
      http.get(OPEN_WEATHER_MAP_CURRENT_WEATHER_URL, () =>
        HttpResponse.json(OPEN_WEATHER_MAP_ERROR_RESPONSE_FIXTURE, {
          status: 404,
        }),
      ),
    )

    await expect(
      getCurrentWeather(OPEN_WEATHER_MAP_TEST_CITY),
    ).resolves.toEqual({
      status: "error",
      code: 404,
      message: OPEN_WEATHER_MAP_ERROR_RESPONSE_FIXTURE.message,
    })
  })

  it("uses a stable fallback when an API error message is malformed", async () => {
    vi.stubEnv("OPEN_WEATHER_MAP_API_KEY", OPEN_WEATHER_MAP_TEST_API_KEY)
    mswServer.use(
      http.get(OPEN_WEATHER_MAP_CURRENT_WEATHER_URL, () =>
        HttpResponse.json({ message: 500 }, { status: 503 }),
      ),
    )

    await expect(
      getCurrentWeather(OPEN_WEATHER_MAP_TEST_CITY),
    ).resolves.toEqual({
      status: "error",
      code: 503,
      message: "Weather service request failed",
    })
  })

  it("rejects successful responses that violate the weather contract", async () => {
    vi.stubEnv("OPEN_WEATHER_MAP_API_KEY", OPEN_WEATHER_MAP_TEST_API_KEY)
    mswServer.use(
      http.get(OPEN_WEATHER_MAP_CURRENT_WEATHER_URL, () =>
        HttpResponse.json({ main: { temp: "warm" }, weather: [] }),
      ),
    )

    await expect(
      getCurrentWeather(OPEN_WEATHER_MAP_TEST_CITY),
    ).resolves.toEqual({
      status: "error",
      code: 502,
      message: "Weather service returned invalid data",
    })
  })

  it("rejects successful responses that are not JSON", async () => {
    vi.stubEnv("OPEN_WEATHER_MAP_API_KEY", OPEN_WEATHER_MAP_TEST_API_KEY)
    mswServer.use(
      http.get(OPEN_WEATHER_MAP_CURRENT_WEATHER_URL, () =>
        HttpResponse.text("not-json"),
      ),
    )

    await expect(
      getCurrentWeather(OPEN_WEATHER_MAP_TEST_CITY),
    ).resolves.toEqual({
      status: "error",
      code: 502,
      message: "Weather service returned invalid data",
    })
  })

  it("returns a typed error when the weather request fails", async () => {
    vi.stubEnv("OPEN_WEATHER_MAP_API_KEY", OPEN_WEATHER_MAP_TEST_API_KEY)
    mswServer.use(
      http.get(OPEN_WEATHER_MAP_CURRENT_WEATHER_URL, () =>
        HttpResponse.error(),
      ),
    )

    await expect(
      getCurrentWeather(OPEN_WEATHER_MAP_TEST_CITY),
    ).resolves.toEqual({
      status: "error",
      code: 500,
      message: "Failed to fetch",
    })
  })
})
