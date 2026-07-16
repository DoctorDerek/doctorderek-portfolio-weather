import "server-only"

import { CurrentWeatherData } from "@/src/types/weather"
import { getErrorMessage } from "@/src/utils/error"

export default async function getCurrentWeather(
  city: string,
): Promise<CurrentWeatherData> {
  const openWeatherMapApiKey = process.env.OPEN_WEATHER_MAP_API_KEY

  if (!openWeatherMapApiKey) {
    return {
      cod: 500,
      message: "API key is not configured",
    } as CurrentWeatherData
  }

  try {
    const response = await fetch(
      `https://api.openweathermap.org/data/2.5/weather?q=${encodeURIComponent(
        city,
      )}&appid=${openWeatherMapApiKey}`,
    )

    return await response.json()
  } catch (error) {
    return {
      cod: 500,
      message: getErrorMessage(error),
    } as CurrentWeatherData
  }
}
