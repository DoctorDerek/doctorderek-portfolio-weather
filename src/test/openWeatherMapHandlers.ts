import { http, HttpResponse } from "msw"
import { OPEN_WEATHER_MAP_CURRENT_WEATHER_URL } from "@/src/services/weatherConfig"
import {
  OPEN_WEATHER_MAP_SUCCESS_RESPONSE_FIXTURE,
  OPEN_WEATHER_MAP_TEST_API_KEY,
  OPEN_WEATHER_MAP_TEST_CITY,
} from "@/src/test/openWeatherMapFixtures"

export const openWeatherMapRequestHandlers = [
  http.get(OPEN_WEATHER_MAP_CURRENT_WEATHER_URL, ({ request }) => {
    const requestUrl = new URL(request.url)
    const city = requestUrl.searchParams.get("q")
    const apiKey = requestUrl.searchParams.get("appid")

    if (
      city !== OPEN_WEATHER_MAP_TEST_CITY ||
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
