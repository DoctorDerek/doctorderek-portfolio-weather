"use client"

import dynamic from "next/dynamic"
import { Toaster } from "react-hot-toast"
import BackgroundImage from "@/src/components/BackgroundImage"
import WeatherSearch from "@/src/components/WeatherSearch"
import type { WeatherResult } from "@/src/types/weather"

const WEATHER_ERROR_TOAST_DURATION_MILLISECONDS = 5000
const ToggleDarkMode = dynamic(
  () => import("@/src/components/ToggleDarkMode"),
  { ssr: false },
)

export default function App({
  initialCity,
  weatherResult,
}: {
  initialCity: string | null
  weatherResult: WeatherResult | null
}) {
  return (
    <>
      <Toaster
        position="top-left"
        toastOptions={{ duration: WEATHER_ERROR_TOAST_DURATION_MILLISECONDS }}
      />
      <ToggleDarkMode />
      <WeatherSearch initialCity={initialCity} weatherResult={weatherResult} />
      <BackgroundImage />
    </>
  )
}
