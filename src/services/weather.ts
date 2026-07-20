import "server-only"
import { OPEN_WEATHER_MAP_CURRENT_WEATHER_URL } from "@/src/services/weatherConfig"
import type { WeatherCoordinates, WeatherResult } from "@/src/types/weather"
import { getErrorMessage } from "@/src/utils/error"

const OPEN_WEATHER_MAP_REQUEST_FAILED_MESSAGE = "Weather service request failed"
const OPEN_WEATHER_MAP_INVALID_RESPONSE_MESSAGE =
  "Weather service returned invalid data"
const CURRENT_LOCATION_FALLBACK_NAME = "Current location"

type CurrentWeatherLocation =
  | { city: string }
  | { coordinates: WeatherCoordinates }

type OpenWeatherMapSuccessResponse = {
  name: string
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
    !("name" in responsePayload) ||
    typeof responsePayload.name !== "string" ||
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
  currentWeatherLocation: CurrentWeatherLocation,
  openWeatherMapApiKey: string,
) {
  const requestUrl = new URL(OPEN_WEATHER_MAP_CURRENT_WEATHER_URL)

  if ("city" in currentWeatherLocation) {
    requestUrl.searchParams.set("q", currentWeatherLocation.city)
  } else {
    requestUrl.searchParams.set(
      "lat",
      String(currentWeatherLocation.coordinates.latitude),
    )
    requestUrl.searchParams.set(
      "lon",
      String(currentWeatherLocation.coordinates.longitude),
    )
  }

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

async function requestCurrentWeather(
  currentWeatherLocation: CurrentWeatherLocation,
  fallbackLocationName: string,
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
      createOpenWeatherMapRequestUrl(
        currentWeatherLocation,
        openWeatherMapApiKey,
      ),
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
      locationName:
        openWeatherMapResponsePayload.name.trim() || fallbackLocationName,
    }
  } catch (error) {
    return {
      status: "error",
      code: 500,
      message: getErrorMessage(error),
    }
  }
}

export default function getCurrentWeather(city: string) {
  return requestCurrentWeather({ city }, city)
}

export function getCurrentWeatherByCoordinates(
  coordinates: WeatherCoordinates,
) {
  return requestCurrentWeather({ coordinates }, CURRENT_LOCATION_FALLBACK_NAME)
}
