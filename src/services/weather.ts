import "server-only"
import { OPEN_WEATHER_MAP_CURRENT_WEATHER_URL } from "@/src/services/weatherConfig"
import type { WeatherResult } from "@/src/types/weather"
import { getErrorMessage } from "@/src/utils/error"

const OPEN_WEATHER_MAP_REQUEST_FAILED_MESSAGE = "Weather service request failed"
const OPEN_WEATHER_MAP_INVALID_RESPONSE_MESSAGE =
  "Weather service returned invalid data"

type OpenWeatherMapSuccessResponse = {
  main: {
    temp: number
  }
  weather: [
    {
      description: string
      icon: string
    },
  ]
}

function isNonNullObject(value: unknown): value is object {
  return typeof value === "object" && value !== null
}

function isOpenWeatherMapSuccessResponse(
  responsePayload: unknown,
): responsePayload is OpenWeatherMapSuccessResponse {
  if (
    !isNonNullObject(responsePayload) ||
    !("main" in responsePayload) ||
    !("weather" in responsePayload)
  ) {
    return false
  }

  const { main, weather } = responsePayload

  if (
    !isNonNullObject(main) ||
    !("temp" in main) ||
    typeof main.temp !== "number" ||
    !Array.isArray(weather) ||
    weather.length === 0
  ) {
    return false
  }

  const [currentWeather] = weather

  return (
    isNonNullObject(currentWeather) &&
    "description" in currentWeather &&
    typeof currentWeather.description === "string" &&
    "icon" in currentWeather &&
    typeof currentWeather.icon === "string"
  )
}

function getOpenWeatherMapErrorMessage(responsePayload: unknown) {
  if (
    isNonNullObject(responsePayload) &&
    "message" in responsePayload &&
    typeof responsePayload.message === "string"
  ) {
    return responsePayload.message
  }

  return OPEN_WEATHER_MAP_REQUEST_FAILED_MESSAGE
}

function createOpenWeatherMapRequestUrl(
  city: string,
  openWeatherMapApiKey: string,
) {
  const requestUrl = new URL(OPEN_WEATHER_MAP_CURRENT_WEATHER_URL)
  requestUrl.searchParams.set("q", city)
  requestUrl.searchParams.set("appid", openWeatherMapApiKey)
  return requestUrl
}

async function readOpenWeatherMapResponse(openWeatherMapResponse: Response) {
  try {
    const responsePayload: unknown = await openWeatherMapResponse.json()
    return responsePayload
  } catch {
    return null
  }
}

export default async function getCurrentWeather(
  city: string,
): Promise<WeatherResult> {
  const openWeatherMapApiKey = process.env.OPEN_WEATHER_MAP_API_KEY

  if (!openWeatherMapApiKey) {
    return {
      status: "error",
      code: 500,
      message: "API key is not configured",
    }
  }

  try {
    const openWeatherMapResponse = await fetch(
      createOpenWeatherMapRequestUrl(city, openWeatherMapApiKey),
      { cache: "no-store" },
    )
    const openWeatherMapResponsePayload = await readOpenWeatherMapResponse(
      openWeatherMapResponse,
    )

    if (!openWeatherMapResponse.ok) {
      return {
        status: "error",
        code: openWeatherMapResponse.status,
        message: getOpenWeatherMapErrorMessage(openWeatherMapResponsePayload),
      }
    }

    if (!isOpenWeatherMapSuccessResponse(openWeatherMapResponsePayload)) {
      return {
        status: "error",
        code: 502,
        message: OPEN_WEATHER_MAP_INVALID_RESPONSE_MESSAGE,
      }
    }

    const [currentWeather] = openWeatherMapResponsePayload.weather

    return {
      status: "success",
      temperatureKelvin: openWeatherMapResponsePayload.main.temp,
      description: currentWeather.description,
      icon: currentWeather.icon,
    }
  } catch (error) {
    return {
      status: "error",
      code: 500,
      message: getErrorMessage(error),
    }
  }
}
