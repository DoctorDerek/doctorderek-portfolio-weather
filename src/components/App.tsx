"use client"

import { MotionConfig } from "motion/react"
import { Toaster } from "react-hot-toast"
import BackgroundImage from "@/src/components/BackgroundImage"
import ToggleDarkMode from "@/src/components/ToggleDarkMode"
import WeatherSearch from "@/src/components/WeatherSearch"
import type { WeatherResult } from "@/src/types/weather"

const WEATHER_ERROR_TOAST_DURATION_MILLISECONDS = 5000

export default function App({
  initialCity,
  weatherResult,
}: {
  initialCity: string | null
  weatherResult: WeatherResult | null
}) {
  return (
    <MotionConfig reducedMotion="user">
      <Toaster
        position="top-left"
        toastOptions={{ duration: WEATHER_ERROR_TOAST_DURATION_MILLISECONDS }}
      />
      <ToggleDarkMode />
      <WeatherSearch initialCity={initialCity} weatherResult={weatherResult} />
      <BackgroundImage />
    </MotionConfig>
  )
}
