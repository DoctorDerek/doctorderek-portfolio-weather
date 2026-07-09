import type { NextApiRequest, NextApiResponse } from "next"
import { CurrentWeatherData } from "@/src/types/weather"

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<CurrentWeatherData | { cod: number; message: string }>,
) {
  if (req.method !== "GET") {
    return res.status(405).json({ cod: 405, message: "Method Not Allowed" })
  }

  const city = req.query.city as string
  if (!city) {
    return res.status(400).json({ cod: 400, message: "City is required" })
  }

  const API_KEY = process.env.OPEN_WEATHER_MAP_API_KEY

  if (!API_KEY) {
    return res
      .status(500)
      .json({ cod: 500, message: "API key is not configured" })
  }

  try {
    const response = await fetch(
      `https://api.openweathermap.org/data/2.5/weather?q=${encodeURIComponent(
        city,
      )}&appid=${API_KEY}`,
    )

    const data = await response.json()

    // OpenWeather map returns 200 on success, other codes like 404 on failure
    return res.status(response.status).json(data)
  } catch (error) {
    console.error("Error fetching weather data:", error)
    return res.status(500).json({ cod: 500, message: "Internal Server Error" })
  }
}
