import ImageFixed from "next/image"
import { useEffect, useState } from "react"
import Card from "@/src/components/Card"
import Temperature from "@/src/components/Temperature"
import { CurrentWeatherData } from "@/src/types/weather"
import { getErrorMessage } from "@/src/utils/error"
import { upperCaseFirstLetterOfEachWord } from "@/src/utils/text"
import { KtoF } from "@/src/utils/weather"

export default function CityWeather({ city }: { city?: string }) {
  const [weatherResult, setWeatherResult] = useState<CurrentWeatherData | null>(
    null,
  )

  useEffect(() => {
    if (city) {
      fetch(`/api/weather?city=${encodeURIComponent(city)}`)
        .then((r) => r.json())
        .then((result) => setWeatherResult(result))
        .catch((error) => {
          setWeatherResult({
            cod: 500,
            message: getErrorMessage(error),
          } as CurrentWeatherData)
        })
    }
  }, [city])

  if (!city) return null

  const Loading = () => <Card heading="...loading" aria-live="polite" />
  if (!weatherResult) return <Loading />

  const Error = () => (
    <Card heading={`Error ${weatherResult?.cod}`}>
      <div>{upperCaseFirstLetterOfEachWord(weatherResult?.message ?? "")}</div>
    </Card>
  )
  if (weatherResult.cod !== 200) return <Error />
  if (!Array.isArray(weatherResult?.weather)) return <Error />

  const { icon, description } = weatherResult.weather[0]
  const iconUrl = `https://openweathermap.org/img/wn/${icon}@4x.png`

  const temperature = KtoF(weatherResult.main?.temp)

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
