"use client"

import ImageFixed from "next/image"
import { useEffect } from "react"
import toast from "react-hot-toast"
import Card from "@/src/components/Card"
import Temperature from "@/src/components/Temperature"
import WeatherLocationDetails from "@/src/components/WeatherLocationDetails"
import type { WeatherResult } from "@/src/types/weather"
import { upperCaseFirstLetterOfEachWord } from "@/src/utils/text"
import {
  convertKelvinToCelsius,
  convertKelvinToFahrenheit,
} from "@/src/utils/weather"

export default function CityWeather({
  city,
  weatherResult,
}: {
  city: string
  weatherResult: WeatherResult | null
}) {
  const weatherErrorMessage =
    weatherResult?.status === "error"
      ? `Error ${weatherResult.code}: ${upperCaseFirstLetterOfEachWord(
          weatherResult.message,
        )}`
      : null

  useEffect(() => {
    if (!weatherErrorMessage) return

    toast.error(weatherErrorMessage, {
      id: `weather-error-${city}-${weatherErrorMessage}`,
      ariaProps: {
        role: "alert",
        "aria-live": "assertive",
      },
    })
  }, [city, weatherErrorMessage])

  if (!weatherResult)
    return (
      <Card
        key={`weather-loading-${city}`}
        heading="Loading weather…"
        ariaLive="polite"
      />
    )

  if (weatherResult.status === "error") return null

  const { icon, description, location, temperatureKelvin } = weatherResult
  const iconUrl = `https://openweathermap.org/img/wn/${icon}@4x.png`

  const temperatureCelsius = convertKelvinToCelsius(temperatureKelvin)
  const temperatureFahrenheit = convertKelvinToFahrenheit(temperatureKelvin)

  return (
    <Card
      key={`weather-result-${city}`}
      heading={location.name}
      ariaLive="polite"
    >
      <WeatherLocationDetails location={location} />
      <div className="mt-2 grid h-28 w-28">
        <div className="relative">
          <ImageFixed
            src={iconUrl}
            alt=""
            fill
            sizes="112px"
            className="object-contain drop-shadow-sm"
          />
        </div>
      </div>
      <p className="-mt-2 text-lg font-medium text-slate-700 dark:text-slate-200">
        {upperCaseFirstLetterOfEachWord(description)}
      </p>
      <Temperature
        temperatureCelsius={temperatureCelsius}
        temperatureFahrenheit={temperatureFahrenheit}
      />
    </Card>
  )
}
