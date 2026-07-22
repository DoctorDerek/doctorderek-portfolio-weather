import { http, HttpResponse } from "msw"
import {
  OPEN_WEATHER_MAP_CURRENT_WEATHER_URL,
  OPEN_WEATHER_MAP_DIRECT_GEOCODING_URL,
  OPEN_WEATHER_MAP_REVERSE_GEOCODING_URL,
} from "@/src/services/weatherConfig"
import {
  OPEN_WEATHER_MAP_GEOCODING_RESPONSE_FIXTURE,
  OPEN_WEATHER_MAP_SUCCESS_RESPONSE_FIXTURE,
  OPEN_WEATHER_MAP_TEST_API_KEY,
  OPEN_WEATHER_MAP_TEST_CITY,
  OPEN_WEATHER_MAP_TEST_COORDINATES,
} from "@/src/test/openWeatherMapFixtures"

export const openWeatherMapRequestHandlers = [
  http.get(OPEN_WEATHER_MAP_DIRECT_GEOCODING_URL, ({ request }) => {
    const requestUrl = new URL(request.url)
    const city = requestUrl.searchParams.get("q")
    const limit = requestUrl.searchParams.get("limit")
    const apiKey = requestUrl.searchParams.get("appid")

    if (
      city !== OPEN_WEATHER_MAP_TEST_CITY ||
      limit !== "1" ||
      apiKey !== OPEN_WEATHER_MAP_TEST_API_KEY
    ) {
      return HttpResponse.json(
        { message: "Unexpected direct geocoding request parameters" },
        { status: 400 },
      )
    }

    return HttpResponse.json(OPEN_WEATHER_MAP_GEOCODING_RESPONSE_FIXTURE)
  }),
  http.get(OPEN_WEATHER_MAP_REVERSE_GEOCODING_URL, ({ request }) => {
    const requestUrl = new URL(request.url)
    const latitude = requestUrl.searchParams.get("lat")
    const longitude = requestUrl.searchParams.get("lon")
    const limit = requestUrl.searchParams.get("limit")
    const apiKey = requestUrl.searchParams.get("appid")

    if (
      latitude !== String(OPEN_WEATHER_MAP_TEST_COORDINATES.latitude) ||
      longitude !== String(OPEN_WEATHER_MAP_TEST_COORDINATES.longitude) ||
      limit !== "1" ||
      apiKey !== OPEN_WEATHER_MAP_TEST_API_KEY
    ) {
      return HttpResponse.json(
        { message: "Unexpected reverse geocoding request parameters" },
        { status: 400 },
      )
    }

    return HttpResponse.json(OPEN_WEATHER_MAP_GEOCODING_RESPONSE_FIXTURE)
  }),
  http.get(OPEN_WEATHER_MAP_CURRENT_WEATHER_URL, ({ request }) => {
    const requestUrl = new URL(request.url)
    const city = requestUrl.searchParams.get("q")
    const latitude = requestUrl.searchParams.get("lat")
    const longitude = requestUrl.searchParams.get("lon")
    const apiKey = requestUrl.searchParams.get("appid")
    const isExpectedCityRequest =
      city === OPEN_WEATHER_MAP_TEST_CITY && !latitude && !longitude
    const isExpectedCoordinateRequest =
      !city &&
      latitude === String(OPEN_WEATHER_MAP_TEST_COORDINATES.latitude) &&
      longitude === String(OPEN_WEATHER_MAP_TEST_COORDINATES.longitude)

    if (
      (!isExpectedCityRequest && !isExpectedCoordinateRequest) ||
      apiKey !== OPEN_WEATHER_MAP_TEST_API_KEY
    ) {
      return HttpResponse.json(
        { message: "Unexpected OpenWeatherMap request parameters" },
        { status: 400 },
      )
    }

    return HttpResponse.json(OPEN_WEATHER_MAP_SUCCESS_RESPONSE_FIXTURE)
  }),
]
