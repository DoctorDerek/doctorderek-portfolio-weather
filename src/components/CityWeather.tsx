"use client"

import ImageFixed from "next/image"
import { useEffect } from "react"
import toast from "react-hot-toast"
import Card from "@/src/components/Card"
import Temperature from "@/src/components/Temperature"
import { CurrentWeatherData } from "@/src/types/weather"
import { upperCaseFirstLetterOfEachWord } from "@/src/utils/text"
import { KtoF } from "@/src/utils/weather"

export default function CityWeather({
  city,
  weatherResult,
}: {
  city: string
  weatherResult: CurrentWeatherData | null
}) {
  const weatherErrorMessage =
    weatherResult &&
    (weatherResult.cod !== 200 || !Array.isArray(weatherResult.weather))
      ? `Error ${weatherResult.cod}: ${upperCaseFirstLetterOfEachWord(
          weatherResult.message ?? "",
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

  if (!weatherResult) return <Card heading="...loading" aria-live="polite" />

  if (weatherErrorMessage) return null

  const { icon, description } = weatherResult.weather[0]
  const iconUrl = `https://openweathermap.org/img/wn/${icon}@4x.png`

  const temperature = KtoF(weatherResult.main?.temp)

  return (
    <Card heading={city}>
      <div className="grid h-20 w-20">
        <div className="relative">
          <ImageFixed
            src={iconUrl}
            alt={description}
            fill
            className="object-cover"
          />
        </div>
      </div>
      <div>{upperCaseFirstLetterOfEachWord(description)}</div>
      <Temperature degreesF={temperature} />
    </Card>
  )
}
