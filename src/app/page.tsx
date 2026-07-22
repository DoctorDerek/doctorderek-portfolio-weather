import App from "@/src/components/App"
import getCurrentWeather from "@/src/services/weather"
import { normalizeCityQuery } from "@/src/utils/city"

type SearchParams = Promise<{ city?: string | string[]; q?: string | string[] }>

export default async function Page(props: { searchParams: SearchParams }) {
  const searchParams = await props.searchParams
  const cityParam = searchParams?.city || searchParams?.q
  const city = normalizeCityQuery(
    Array.isArray(cityParam) ? cityParam[0] : cityParam,
  )

  const weatherResult = city ? await getCurrentWeather(city) : null

  return <App initialCity={city} weatherResult={weatherResult} />
}
