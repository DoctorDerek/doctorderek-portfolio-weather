import { useEffect, useState } from "react"
import ImageFixed from "next/image"
import { upperCaseFirstLetterOfEachWord } from "@/src/utils/text"
import { KtoF } from "@/src/utils/weather"

import { CurrentWeatherData } from "@/src/types/weather"
import Card from "@/src/components/Card"
import Temperature from "@/src/components/Temperature"

const API_KEY = process.env.NEXT_PUBLIC_OPEN_WEATHER_MAP_API_KEY

export default function CityWeather({ city }: { city?: string }) {
  const [weatherResult, setWeatherResult] = useState<CurrentWeatherData | null>(
    null,
  )

  useEffect(() => {
    if (city) {
      fetch(
        `https://api.openweathermap.org/data/2.5/weather?q=${city}&appid=${API_KEY}`,
      )
        .then((r) => r.json())
        .then((result) => setWeatherResult(result))
    }
  }, [city])

  if (!city) return null

  const Loading = () => <Card heading="...loading" aria-live="polite" />
  if (!weatherResult) return <Loading />

  const Error = () => (
    <Card heading={`Error ${weatherResult?.cod}`}>
      <div>{upperCaseFirstLetterOfEachWord(weatherResult?.message)}</div>
    </Card>
  )
  if (weatherResult.cod !== 200) return <Error />
  if (!Array.isArray(weatherResult?.weather)) return <Error />

  const { icon, description } = weatherResult?.weather[0]
  const iconUrl = `https://openweathermap.org/img/wn/${icon}@4x.png`

  const temperature = KtoF(weatherResult?.main?.temp)

  function WeatherIcon() {
    return (
      <div className="grid h-20 w-20">
        <div className="relative">
          <ImageFixed src={iconUrl} layout="fill" className="object-cover" />
        </div>
      </div>
    )
  }

  return (
    <Card heading={city}>
      <WeatherIcon />
      <div>{upperCaseFirstLetterOfEachWord(description)}</div>
      <Temperature degreesF={temperature} />
    </Card>
  )
}
