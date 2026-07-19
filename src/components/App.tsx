"use client"

import { MotionConfig } from "motion/react"
import { useRouter } from "next/navigation"
import { Toaster } from "react-hot-toast"
import BackgroundImage from "@/src/components/BackgroundImage"
import CityWeather from "@/src/components/CityWeather"
import ToggleDarkMode from "@/src/components/ToggleDarkMode"
import type { WeatherResult } from "@/src/types/weather"

const WEATHER_ERROR_TOAST_DURATION_MILLISECONDS = 5000

export default function App({
  initialCity,
  weatherResult,
}: {
  initialCity: string | null
  weatherResult: WeatherResult | null
}) {
  const router = useRouter()

  return (
    <MotionConfig reducedMotion="user">
      <Toaster
        position="top-left"
        toastOptions={{ duration: WEATHER_ERROR_TOAST_DURATION_MILLISECONDS }}
      />
      <ToggleDarkMode />
      <div className="relative z-10 flex h-[90vh] flex-col justify-end py-10 sm:justify-start">
        <form
          className="flex flex-wrap items-center justify-center"
          onSubmit={(e) => {
            e.preventDefault()
            const formdata = new FormData(e.currentTarget)
            const inputCity = String(formdata.get("city"))
            router.push(`/?city=${encodeURIComponent(inputCity)}`)
          }}
        >
          <label htmlFor="city">
            <h1 className="mb-2 rounded-xl px-4 py-1 text-2xl font-semibold tracking-tight sm:mb-0 sm:py-2 sm:text-base dark:bg-black">
              Weather Search:
            </h1>
          </label>
          <div className="flex flex-wrap items-center justify-center">
            <input
              data-testid="weather-input"
              className="ml-2 h-10 w-40 rounded-l-lg border border-solid border-gray-300 p-2"
              type="text"
              name="city"
              id="city"
              defaultValue={initialCity || ""}
            />
            <button
              className="h-10 rounded-r-lg bg-[#4683c8] p-2 text-xs font-bold text-white uppercase"
              type="submit"
            >
              Submit
            </button>
          </div>
        </form>

        {initialCity && (
          <CityWeather city={initialCity} weatherResult={weatherResult} />
        )}
      </div>
      <BackgroundImage />
    </MotionConfig>
  )
}
