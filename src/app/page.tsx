import App from "@/src/components/App"
import { CurrentWeatherData } from "@/src/types/weather"
import { getErrorMessage } from "@/src/utils/error"

type SearchParams = Promise<{ [key: string]: string | string[] | undefined }>

export default async function Page(props: { searchParams: SearchParams }) {
  const searchParams = await props.searchParams
  const cityParam = searchParams?.city || searchParams?.q
  const city = Array.isArray(cityParam) ? cityParam[0] : cityParam

  let weatherResult: CurrentWeatherData | null = null

  if (city) {
    const API_KEY = process.env.OPEN_WEATHER_MAP_API_KEY
    if (!API_KEY) {
      weatherResult = {
        cod: 500,
        message: "API key is not configured",
      } as CurrentWeatherData
    } else {
      try {
        const res = await fetch(
          `https://api.openweathermap.org/data/2.5/weather?q=${encodeURIComponent(
            city,
          )}&appid=${API_KEY}`,
        )
        weatherResult = await res.json()
      } catch (error) {
        weatherResult = {
          cod: 500,
          message: getErrorMessage(error),
        } as CurrentWeatherData
      }
    }
  }

  return <App initialCity={city || null} weatherResult={weatherResult} />
}
