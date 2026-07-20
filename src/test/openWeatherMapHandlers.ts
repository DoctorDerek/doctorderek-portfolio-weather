import { http, HttpResponse } from "msw"
import { OPEN_WEATHER_MAP_CURRENT_WEATHER_URL } from "@/src/services/weatherConfig"
import {
  OPEN_WEATHER_MAP_SUCCESS_RESPONSE_FIXTURE,
  OPEN_WEATHER_MAP_TEST_API_KEY,
  OPEN_WEATHER_MAP_TEST_CITY,
  OPEN_WEATHER_MAP_TEST_COORDINATES,
} from "@/src/test/openWeatherMapFixtures"

export const openWeatherMapRequestHandlers = [
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
