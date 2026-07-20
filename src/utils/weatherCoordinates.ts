import type { WeatherCoordinates } from "@/src/types/weather"

const WEATHER_COORDINATE_DECIMAL_SCALE = 100
const MINIMUM_LATITUDE = -90
const MAXIMUM_LATITUDE = 90
const MINIMUM_LONGITUDE = -180
const MAXIMUM_LONGITUDE = 180

export function isWeatherCoordinates(
  value: unknown,
): value is WeatherCoordinates {
  if (
    typeof value !== "object" ||
    value === null ||
    !("latitude" in value) ||
    !("longitude" in value)
  ) {
    return false
  }

  const { latitude, longitude } = value

  return (
    typeof latitude === "number" &&
    Number.isFinite(latitude) &&
    latitude >= MINIMUM_LATITUDE &&
    latitude <= MAXIMUM_LATITUDE &&
    typeof longitude === "number" &&
    Number.isFinite(longitude) &&
    longitude >= MINIMUM_LONGITUDE &&
    longitude <= MAXIMUM_LONGITUDE
  )
}

export function roundWeatherCoordinates({
  latitude,
  longitude,
}: WeatherCoordinates): WeatherCoordinates {
  return {
    latitude:
      Math.round(latitude * WEATHER_COORDINATE_DECIMAL_SCALE) /
      WEATHER_COORDINATE_DECIMAL_SCALE,
    longitude:
      Math.round(longitude * WEATHER_COORDINATE_DECIMAL_SCALE) /
      WEATHER_COORDINATE_DECIMAL_SCALE,
  }
}
