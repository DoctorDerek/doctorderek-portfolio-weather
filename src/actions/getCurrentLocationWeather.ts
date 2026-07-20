"use server"

import { getCurrentWeatherByCoordinates } from "@/src/services/weather"
import type { WeatherCoordinates, WeatherResult } from "@/src/types/weather"
import {
  isWeatherCoordinates,
  roundWeatherCoordinates,
} from "@/src/utils/weatherCoordinates"

const INVALID_WEATHER_COORDINATES_MESSAGE = "Location coordinates are invalid"

export async function getCurrentLocationWeather(
  coordinates: WeatherCoordinates,
): Promise<WeatherResult> {
  if (!isWeatherCoordinates(coordinates)) {
    return {
      status: "error",
      code: 400,
      message: INVALID_WEATHER_COORDINATES_MESSAGE,
    }
  }

  return getCurrentWeatherByCoordinates(roundWeatherCoordinates(coordinates))
}
