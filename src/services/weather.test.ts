import { http, HttpResponse } from "msw"
import { afterEach, describe, expect, it, vi } from "vitest"
import getCurrentWeather, {
  getCurrentWeatherByCoordinates,
} from "@/src/services/weather"
import {
  OPEN_WEATHER_MAP_CURRENT_WEATHER_URL,
  OPEN_WEATHER_MAP_DIRECT_GEOCODING_URL,
  OPEN_WEATHER_MAP_REVERSE_GEOCODING_URL,
} from "@/src/services/weatherConfig"
import mswServer from "@/src/test/mswServer"
import {
  OPEN_WEATHER_MAP_ERROR_RESPONSE_FIXTURE,
  OPEN_WEATHER_MAP_GEOCODING_RESPONSE_FIXTURE,
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
      location: {
        name: OPEN_WEATHER_MAP_GEOCODING_RESPONSE_FIXTURE[0].name,
        stateName: OPEN_WEATHER_MAP_GEOCODING_RESPONSE_FIXTURE[0].state,
        countryCode: OPEN_WEATHER_MAP_GEOCODING_RESPONSE_FIXTURE[0].country,
      },
    })
  })

  it("returns city not found when direct geocoding has no matches", async () => {
    vi.stubEnv("OPEN_WEATHER_MAP_API_KEY", OPEN_WEATHER_MAP_TEST_API_KEY)
    mswServer.use(
      http.get(OPEN_WEATHER_MAP_DIRECT_GEOCODING_URL, () =>
        HttpResponse.json([]),
      ),
    )

    await expect(
      getCurrentWeather(OPEN_WEATHER_MAP_TEST_CITY),
    ).resolves.toEqual({
      status: "error",
      code: 404,
      message: "city not found",
    })
  })

  it("rejects direct geocoding payloads that are not location arrays", async () => {
    vi.stubEnv("OPEN_WEATHER_MAP_API_KEY", OPEN_WEATHER_MAP_TEST_API_KEY)
    mswServer.use(
      http.get(OPEN_WEATHER_MAP_DIRECT_GEOCODING_URL, () =>
        HttpResponse.json({ name: OPEN_WEATHER_MAP_TEST_CITY }),
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

  it("rejects malformed direct geocoding locations", async () => {
    vi.stubEnv("OPEN_WEATHER_MAP_API_KEY", OPEN_WEATHER_MAP_TEST_API_KEY)
    mswServer.use(
      http.get(OPEN_WEATHER_MAP_DIRECT_GEOCODING_URL, () =>
        HttpResponse.json([
          {
            ...OPEN_WEATHER_MAP_GEOCODING_RESPONSE_FIXTURE[0],
            state: 500,
          },
        ]),
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

  it.each([
    {
      invalidIdentity: {
        ...OPEN_WEATHER_MAP_GEOCODING_RESPONSE_FIXTURE[0],
        name: "   ",
      },
      violatedContract: "blank names",
    },
    {
      invalidIdentity: {
        ...OPEN_WEATHER_MAP_GEOCODING_RESPONSE_FIXTURE[0],
        country: "MEX",
      },
      violatedContract: "invalid country codes",
    },
  ])(
    "rejects geocoding identity with $violatedContract",
    async ({ invalidIdentity }) => {
      vi.stubEnv("OPEN_WEATHER_MAP_API_KEY", OPEN_WEATHER_MAP_TEST_API_KEY)
      mswServer.use(
        http.get(OPEN_WEATHER_MAP_DIRECT_GEOCODING_URL, () =>
          HttpResponse.json([invalidIdentity]),
        ),
      )

      await expect(
        getCurrentWeather(OPEN_WEATHER_MAP_TEST_CITY),
      ).resolves.toEqual({
        status: "error",
        code: 502,
        message: "Weather service returned invalid data",
      })
    },
  )

  it("normalizes geocoded names, states, and country codes", async () => {
    vi.stubEnv("OPEN_WEATHER_MAP_API_KEY", OPEN_WEATHER_MAP_TEST_API_KEY)
    mswServer.use(
      http.get(OPEN_WEATHER_MAP_DIRECT_GEOCODING_URL, () =>
        HttpResponse.json([
          {
            ...OPEN_WEATHER_MAP_GEOCODING_RESPONSE_FIXTURE[0],
            name: `  ${OPEN_WEATHER_MAP_TEST_CITY}  `,
            state: "  Mexico City  ",
            country: "mx",
          },
        ]),
      ),
    )

    await expect(
      getCurrentWeather(OPEN_WEATHER_MAP_TEST_CITY),
    ).resolves.toMatchObject({
      status: "success",
      location: {
        name: OPEN_WEATHER_MAP_TEST_CITY,
        stateName: "Mexico City",
        countryCode: "MX",
      },
    })
  })

  it("allows direct geocoding locations without a state", async () => {
    vi.stubEnv("OPEN_WEATHER_MAP_API_KEY", OPEN_WEATHER_MAP_TEST_API_KEY)
    mswServer.use(
      http.get(OPEN_WEATHER_MAP_DIRECT_GEOCODING_URL, () =>
        HttpResponse.json([
          {
            name: OPEN_WEATHER_MAP_TEST_CITY,
            country: "MX",
            lat: OPEN_WEATHER_MAP_TEST_COORDINATES.latitude,
            lon: OPEN_WEATHER_MAP_TEST_COORDINATES.longitude,
          },
        ]),
      ),
    )

    await expect(
      getCurrentWeather(OPEN_WEATHER_MAP_TEST_CITY),
    ).resolves.toMatchObject({
      status: "success",
      location: {
        stateName: null,
      },
    })
  })

  it("preserves direct geocoding API errors", async () => {
    vi.stubEnv("OPEN_WEATHER_MAP_API_KEY", OPEN_WEATHER_MAP_TEST_API_KEY)
    mswServer.use(
      http.get(OPEN_WEATHER_MAP_DIRECT_GEOCODING_URL, () =>
        HttpResponse.json(
          { message: "geocoding unavailable" },
          { status: 503 },
        ),
      ),
    )

    await expect(
      getCurrentWeather(OPEN_WEATHER_MAP_TEST_CITY),
    ).resolves.toEqual({
      status: "error",
      code: 503,
      message: "geocoding unavailable",
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
      location: {
        name: OPEN_WEATHER_MAP_GEOCODING_RESPONSE_FIXTURE[0].name,
        stateName: OPEN_WEATHER_MAP_GEOCODING_RESPONSE_FIXTURE[0].state,
        countryCode: OPEN_WEATHER_MAP_GEOCODING_RESPONSE_FIXTURE[0].country,
      },
    })
  })

  it("returns a configuration error before coordinate requests", async () => {
    vi.stubEnv("OPEN_WEATHER_MAP_API_KEY", "")

    await expect(
      getCurrentWeatherByCoordinates(OPEN_WEATHER_MAP_TEST_COORDINATES),
    ).resolves.toEqual({
      status: "error",
      code: 500,
      message: "API key is not configured",
    })
  })

  it("falls back to weather identity when reverse geocoding fails", async () => {
    vi.stubEnv("OPEN_WEATHER_MAP_API_KEY", OPEN_WEATHER_MAP_TEST_API_KEY)
    mswServer.use(
      http.get(OPEN_WEATHER_MAP_REVERSE_GEOCODING_URL, () =>
        HttpResponse.error(),
      ),
    )

    await expect(
      getCurrentWeatherByCoordinates(OPEN_WEATHER_MAP_TEST_COORDINATES),
    ).resolves.toMatchObject({
      status: "success",
      location: {
        name: OPEN_WEATHER_MAP_SUCCESS_RESPONSE_FIXTURE.name,
        stateName: null,
        countryCode: OPEN_WEATHER_MAP_SUCCESS_RESPONSE_FIXTURE.sys.country,
      },
    })
  })

  it("falls back to weather identity for malformed reverse geocoding", async () => {
    vi.stubEnv("OPEN_WEATHER_MAP_API_KEY", OPEN_WEATHER_MAP_TEST_API_KEY)
    mswServer.use(
      http.get(OPEN_WEATHER_MAP_REVERSE_GEOCODING_URL, () =>
        HttpResponse.json([{ name: OPEN_WEATHER_MAP_TEST_CITY }]),
      ),
    )

    await expect(
      getCurrentWeatherByCoordinates(OPEN_WEATHER_MAP_TEST_COORDINATES),
    ).resolves.toMatchObject({
      status: "success",
      location: {
        name: OPEN_WEATHER_MAP_SUCCESS_RESPONSE_FIXTURE.name,
        stateName: null,
        countryCode: OPEN_WEATHER_MAP_SUCCESS_RESPONSE_FIXTURE.sys.country,
      },
    })
  })

  it("preserves coordinate weather failures after reverse geocoding", async () => {
    vi.stubEnv("OPEN_WEATHER_MAP_API_KEY", OPEN_WEATHER_MAP_TEST_API_KEY)
    mswServer.use(
      http.get(OPEN_WEATHER_MAP_CURRENT_WEATHER_URL, () =>
        HttpResponse.json(OPEN_WEATHER_MAP_ERROR_RESPONSE_FIXTURE, {
          status: 503,
        }),
      ),
    )

    await expect(
      getCurrentWeatherByCoordinates(OPEN_WEATHER_MAP_TEST_COORDINATES),
    ).resolves.toEqual({
      status: "error",
      code: 503,
      message: OPEN_WEATHER_MAP_ERROR_RESPONSE_FIXTURE.message,
    })
  })

  it("uses a stable heading when coordinate weather has no place name", async () => {
    vi.stubEnv("OPEN_WEATHER_MAP_API_KEY", OPEN_WEATHER_MAP_TEST_API_KEY)
    mswServer.use(
      http.get(OPEN_WEATHER_MAP_REVERSE_GEOCODING_URL, () =>
        HttpResponse.json([]),
      ),
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
      location: {
        name: "Current location",
      },
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

  it("rejects weather responses with invalid country identity", async () => {
    vi.stubEnv("OPEN_WEATHER_MAP_API_KEY", OPEN_WEATHER_MAP_TEST_API_KEY)
    mswServer.use(
      http.get(OPEN_WEATHER_MAP_CURRENT_WEATHER_URL, () =>
        HttpResponse.json({
          ...OPEN_WEATHER_MAP_SUCCESS_RESPONSE_FIXTURE,
          sys: { country: "MEX" },
        }),
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

  it.each([
    {
      responsePayload: {
        name: OPEN_WEATHER_MAP_TEST_CITY,
        main: { temp: 300.15 },
        weather: [],
      },
      violatedContract: "empty weather observations",
    },
    {
      responsePayload: {
        name: OPEN_WEATHER_MAP_TEST_CITY,
        main: { temp: 300.15 },
        weather: [null],
      },
      violatedContract: "malformed weather observations",
    },
  ])(
    "rejects $violatedContract in successful responses",
    async ({ responsePayload }) => {
      vi.stubEnv("OPEN_WEATHER_MAP_API_KEY", OPEN_WEATHER_MAP_TEST_API_KEY)
      mswServer.use(
        http.get(OPEN_WEATHER_MAP_CURRENT_WEATHER_URL, () =>
          HttpResponse.json(responsePayload),
        ),
      )

      await expect(
        getCurrentWeather(OPEN_WEATHER_MAP_TEST_CITY),
      ).resolves.toEqual({
        status: "error",
        code: 502,
        message: "Weather service returned invalid data",
      })
    },
  )

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
