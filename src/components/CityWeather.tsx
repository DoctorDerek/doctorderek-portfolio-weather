"use client"

import ImageFixed from "next/image"
import { useLayoutEffect } from "react"
import toast from "react-hot-toast/headless"
import Card from "@/src/components/Card"
import Temperature from "@/src/components/Temperature"
import WeatherLocationDetails from "@/src/components/WeatherLocationDetails"
import type { WeatherResult } from "@/src/types/weather"
import { getCountryName } from "@/src/utils/country"
import { upperCaseFirstLetterOfEachWord } from "@/src/utils/text"
import {
  convertKelvinToCelsius,
  convertKelvinToFahrenheit,
} from "@/src/utils/weather"

export default function CityWeather({
  city,
  weatherResult,
}: {
  city: string | null
  weatherResult: WeatherResult | null
}) {
  const resultLocation = city ?? "Current location"
  const weatherErrorMessage =
    weatherResult?.status === "error"
      ? `Error ${weatherResult.code}: ${upperCaseFirstLetterOfEachWord(
          weatherResult.message,
        )}`
      : ""

  useLayoutEffect(() => {
    if (weatherResult?.status !== "error") return

    const toastId = toast.error(weatherErrorMessage, {
      id: `weather-error-${resultLocation}-${weatherErrorMessage}`,
      ariaProps: {
        role: "status",
        "aria-live": "off",
      },
    })

    return () => toast.remove(toastId)
  }, [resultLocation, weatherErrorMessage, weatherResult])

  if (!weatherResult)
    return (
      <Card
        key={`weather-loading-${resultLocation}`}
        heading={city ? `Loading forecast for ${city}…` : "Loading weather…"}
        ariaLive="polite"
      >
        <div className="mt-2 flex gap-2" aria-hidden="true">
          <span className="size-2 rounded-full bg-blue-600 motion-safe:animate-pulse dark:bg-blue-400" />
          <span className="size-2 rounded-full bg-blue-600 motion-safe:animate-pulse dark:bg-blue-400" />
          <span className="size-2 rounded-full bg-blue-600 motion-safe:animate-pulse dark:bg-blue-400" />
        </div>
      </Card>
    )

  if (weatherResult.status === "error")
    return (
      <Card
        key={`weather-error-${resultLocation}`}
        heading={weatherErrorMessage}
        ariaLive="assertive"
      />
    )

  const { icon, description, location, temperatureKelvin } = weatherResult
  const iconUrl = `https://openweathermap.org/img/wn/${icon}@4x.png`
  const countryName = getCountryName(location.countryCode)
  const locationSummary = location.stateName
    ? `${location.stateName}, ${countryName}`
    : countryName

  const temperatureCelsius = convertKelvinToCelsius(temperatureKelvin)
  const temperatureFahrenheit = convertKelvinToFahrenheit(temperatureKelvin)

  return (
    <Card
      key={`weather-result-${resultLocation}`}
      heading={location.name}
      ariaLive="polite"
    >
      <Temperature
        temperatureCelsius={temperatureCelsius}
        temperatureFahrenheit={temperatureFahrenheit}
      />
      <p
        aria-hidden="true"
        className="forecast-fit:col-span-full mt-2 text-xs tracking-wide text-slate-500 dark:text-slate-300"
      >
        {locationSummary}
      </p>
      <WeatherLocationDetails location={location} />
      <div className="forecast-fit:col-start-1 forecast-fit:row-start-3 forecast-fit:m-0 forecast-fit:size-11 forecast-fit:justify-self-end mt-2 grid h-28 w-28">
        <div className="relative">
          <ImageFixed
            src={iconUrl}
            alt=""
            fill
            unoptimized
            sizes="112px"
            className="object-contain drop-shadow-sm"
          />
        </div>
      </div>
      <p className="forecast-fit:col-start-2 forecast-fit:row-start-3 forecast-fit:m-0 forecast-fit:justify-self-start -mt-2 text-lg font-medium text-slate-700 dark:text-slate-200">
        {upperCaseFirstLetterOfEachWord(description)}
      </p>
    </Card>
  )
}
