import "server-only"
import {
  OPEN_WEATHER_MAP_CURRENT_WEATHER_URL,
  OPEN_WEATHER_MAP_DIRECT_GEOCODING_URL,
  OPEN_WEATHER_MAP_REVERSE_GEOCODING_URL,
} from "@/src/services/weatherConfig"
import type {
  WeatherCoordinates,
  WeatherLocation,
  WeatherResult,
} from "@/src/types/weather"
import { getErrorMessage } from "@/src/utils/error"

const OPEN_WEATHER_MAP_REQUEST_FAILED_MESSAGE = "Weather service request failed"
const OPEN_WEATHER_MAP_INVALID_RESPONSE_MESSAGE =
  "Weather service returned invalid data"
const CITY_NOT_FOUND_MESSAGE = "city not found"
const CURRENT_LOCATION_FALLBACK_NAME = "Current location"
const ISO_COUNTRY_CODE_PATTERN = /^[A-Z]{2}$/i

type WeatherRequestError = Extract<WeatherResult, { status: "error" }>

type OpenWeatherMapRequestResult =
  { status: "success"; responsePayload: unknown } | WeatherRequestError

type GeocodedLocationResult =
  | {
      status: "success"
      coordinates: WeatherCoordinates
      location: WeatherLocation
    }
  | WeatherRequestError

type OpenWeatherMapApiKeyResult =
  { status: "success"; apiKey: string } | WeatherRequestError

type OpenWeatherMapGeocodingLocation = {
  name: string
  state?: string
  country: string
  lat: number
  lon: number
}

type OpenWeatherMapSuccessResponse = {
  name: string
  sys: {
    country: string
  }
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
    !("sys" in responsePayload) ||
    !("main" in responsePayload) ||
    !("weather" in responsePayload)
  ) {
    return false
  }

  const { main, sys, weather } = responsePayload

  if (
    !isNonNullObject(sys) ||
    !("country" in sys) ||
    typeof sys.country !== "string" ||
    !ISO_COUNTRY_CODE_PATTERN.test(sys.country) ||
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

function isOpenWeatherMapGeocodingLocation(
  responsePayload: unknown,
): responsePayload is OpenWeatherMapGeocodingLocation {
  if (
    !isNonNullObject(responsePayload) ||
    !("name" in responsePayload) ||
    typeof responsePayload.name !== "string" ||
    !("country" in responsePayload) ||
    typeof responsePayload.country !== "string" ||
    !("lat" in responsePayload) ||
    typeof responsePayload.lat !== "number" ||
    !("lon" in responsePayload) ||
    typeof responsePayload.lon !== "number"
  ) {
    return false
  }

  if ("state" in responsePayload && typeof responsePayload.state !== "string") {
    return false
  }

  return (
    responsePayload.name.trim().length > 0 &&
    ISO_COUNTRY_CODE_PATTERN.test(responsePayload.country) &&
    Number.isFinite(responsePayload.lat) &&
    Number.isFinite(responsePayload.lon)
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
  coordinates: WeatherCoordinates,
  openWeatherMapApiKey: string,
) {
  const requestUrl = new URL(OPEN_WEATHER_MAP_CURRENT_WEATHER_URL)
  requestUrl.searchParams.set("lat", String(coordinates.latitude))
  requestUrl.searchParams.set("lon", String(coordinates.longitude))
  requestUrl.searchParams.set("appid", openWeatherMapApiKey)
  return requestUrl
}

function createDirectGeocodingRequestUrl(
  city: string,
  openWeatherMapApiKey: string,
) {
  const requestUrl = new URL(OPEN_WEATHER_MAP_DIRECT_GEOCODING_URL)
  requestUrl.searchParams.set("q", city)
  requestUrl.searchParams.set("limit", "1")
  requestUrl.searchParams.set("appid", openWeatherMapApiKey)
  return requestUrl
}

function createReverseGeocodingRequestUrl(
  coordinates: WeatherCoordinates,
  openWeatherMapApiKey: string,
) {
  const requestUrl = new URL(OPEN_WEATHER_MAP_REVERSE_GEOCODING_URL)
  requestUrl.searchParams.set("lat", String(coordinates.latitude))
  requestUrl.searchParams.set("lon", String(coordinates.longitude))
  requestUrl.searchParams.set("limit", "1")
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

async function requestOpenWeatherMap(
  requestUrl: URL,
): Promise<OpenWeatherMapRequestResult> {
  try {
    const openWeatherMapResponse = await fetch(requestUrl, {
      cache: "no-store",
    })
    const responsePayload = await readOpenWeatherMapResponse(
      openWeatherMapResponse,
    )

    if (!openWeatherMapResponse.ok) {
      return {
        status: "error",
        code: openWeatherMapResponse.status,
        message: getOpenWeatherMapErrorMessage(responsePayload),
      }
    }

    return { status: "success", responsePayload }
  } catch (error) {
    return {
      status: "error",
      code: 500,
      message: getErrorMessage(error),
    }
  }
}

function getOpenWeatherMapApiKey(): OpenWeatherMapApiKeyResult {
  const apiKey = process.env.OPEN_WEATHER_MAP_API_KEY

  return apiKey
    ? { status: "success", apiKey }
    : {
        status: "error",
        code: 500,
        message: "API key is not configured",
      }
}

async function requestGeocodedLocation(
  requestUrl: URL,
): Promise<GeocodedLocationResult> {
  const requestResult = await requestOpenWeatherMap(requestUrl)

  if (requestResult.status === "error") return requestResult

  if (!Array.isArray(requestResult.responsePayload)) {
    return {
      status: "error",
      code: 502,
      message: OPEN_WEATHER_MAP_INVALID_RESPONSE_MESSAGE,
    }
  }

  const [geocodedLocation] = requestResult.responsePayload

  if (!geocodedLocation) {
    return { status: "error", code: 404, message: CITY_NOT_FOUND_MESSAGE }
  }

  if (!isOpenWeatherMapGeocodingLocation(geocodedLocation)) {
    return {
      status: "error",
      code: 502,
      message: OPEN_WEATHER_MAP_INVALID_RESPONSE_MESSAGE,
    }
  }

  return {
    status: "success",
    coordinates: {
      latitude: geocodedLocation.lat,
      longitude: geocodedLocation.lon,
    },
    location: {
      name: geocodedLocation.name.trim(),
      stateName: geocodedLocation.state?.trim() || null,
      countryCode: geocodedLocation.country.toUpperCase(),
    },
  }
}

function requestGeocodedCity(city: string, openWeatherMapApiKey: string) {
  return requestGeocodedLocation(
    createDirectGeocodingRequestUrl(city, openWeatherMapApiKey),
  )
}

function requestGeocodedCoordinates(
  coordinates: WeatherCoordinates,
  openWeatherMapApiKey: string,
) {
  return requestGeocodedLocation(
    createReverseGeocodingRequestUrl(coordinates, openWeatherMapApiKey),
  )
}

async function requestCurrentWeather(
  coordinates: WeatherCoordinates,
  fallbackLocationName: string,
  openWeatherMapApiKey: string,
  resolvedLocation?: WeatherLocation,
): Promise<WeatherResult> {
  const openWeatherMapRequestResult = await requestOpenWeatherMap(
    createOpenWeatherMapRequestUrl(coordinates, openWeatherMapApiKey),
  )

  if (openWeatherMapRequestResult.status === "error") {
    return openWeatherMapRequestResult
  }

  const { responsePayload } = openWeatherMapRequestResult

  if (!isOpenWeatherMapSuccessResponse(responsePayload)) {
    return {
      status: "error",
      code: 502,
      message: OPEN_WEATHER_MAP_INVALID_RESPONSE_MESSAGE,
    }
  }

  const [currentWeather] = responsePayload.weather

  return {
    status: "success",
    temperatureKelvin: responsePayload.main.temp,
    description: currentWeather.description,
    icon: currentWeather.icon,
    location: resolvedLocation ?? {
      name: responsePayload.name.trim() || fallbackLocationName,
      stateName: null,
      countryCode: responsePayload.sys.country.toUpperCase(),
    },
  }
}

export default async function getCurrentWeather(
  city: string,
): Promise<WeatherResult> {
  const apiKeyResult = getOpenWeatherMapApiKey()

  if (apiKeyResult.status === "error") return apiKeyResult

  const geocodedCityResult = await requestGeocodedCity(
    city,
    apiKeyResult.apiKey,
  )

  if (geocodedCityResult.status === "error") return geocodedCityResult

  return requestCurrentWeather(
    geocodedCityResult.coordinates,
    city,
    apiKeyResult.apiKey,
    geocodedCityResult.location,
  )
}

export async function getCurrentWeatherByCoordinates(
  coordinates: WeatherCoordinates,
): Promise<WeatherResult> {
  const apiKeyResult = getOpenWeatherMapApiKey()

  if (apiKeyResult.status === "error") return apiKeyResult

  const [weatherResult, geocodedLocationResult] = await Promise.all([
    requestCurrentWeather(
      coordinates,
      CURRENT_LOCATION_FALLBACK_NAME,
      apiKeyResult.apiKey,
    ),
    requestGeocodedCoordinates(coordinates, apiKeyResult.apiKey),
  ])

  if (
    weatherResult.status === "error" ||
    geocodedLocationResult.status === "error"
  ) {
    return weatherResult
  }

  return { ...weatherResult, location: geocodedLocationResult.location }
}
