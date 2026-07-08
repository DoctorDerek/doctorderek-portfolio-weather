import { useRouter } from "next/router"
import { useEffect, useState } from "react"
import BackgroundImage from "@/src/components/BackgroundImage"
import CityWeather from "@/src/components/CityWeather"
import ToggleDarkMode from "@/src/components/ToggleDarkMode"

export default function App() {
  const router = useRouter()
  const query = router?.query ? router?.query : {}
  const qParam = query?.q ? String(query?.q) : null

  const cityParam = query?.city ? String(query?.city) : null

  const defaultCity = qParam || cityParam
  const [city, setCity] = useState<string | null>(defaultCity)
  useEffect(() => {
    setCity(defaultCity)
  }, [defaultCity])

  return (
    <>
      <ToggleDarkMode />
      <div className="relative z-10 flex h-[90vh] flex-col justify-end py-10 sm:justify-start">
        {/** place the search bar at bottom on mobile for improved UX */}
        <form
          className="flex flex-wrap items-center justify-center"
          onSubmit={(e) => {
            e.preventDefault()
            const formdata = new FormData(e.currentTarget)
            setCity(String(formdata.get("city")))
          }}
        >
          <label htmlFor="city">
            <h1 className="mb-2 rounded-xl px-4 py-1 text-2xl font-semibold tracking-tight dark:bg-black sm:mb-0 sm:py-2 sm:text-base">
              Weather Search:
            </h1>
          </label>
          <div className="flex flex-wrap items-center justify-center">
            {/* wrapper div to avoid flex-wrap on mobile */}
            <input
              data-testid="weather-input"
              className="ml-2 h-10 w-40 rounded-l-lg border border-solid border-gray-300 p-2"
              type="text"
              name="city"
              id="city"
              defaultValue={city || ""}
            />
            <button
              className="h-10 rounded-r-lg bg-[#4683c8] p-2 text-xs font-bold uppercase text-white"
              type="submit"
            >
              Submit
            </button>
          </div>
        </form>

        {city && <CityWeather city={city} />}
      </div>
      <BackgroundImage />
    </>
  )
}
