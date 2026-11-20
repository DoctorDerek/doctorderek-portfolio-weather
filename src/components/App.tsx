"use client"

import dynamic from "next/dynamic"
import BackgroundImage from "@/src/components/BackgroundImage"
import WeatherNotices from "@/src/components/WeatherNotices"
import WeatherSearch from "@/src/components/WeatherSearch"
import type { WeatherResult } from "@/src/types/weather"

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
      <ToggleDarkMode />
      <div className="grid h-dvh grid-rows-[minmax(0,1fr)_auto] lg:contents">
        <div
          data-search-viewport=""
          className="min-h-0 overflow-y-auto lg:contents"
        >
          <WeatherSearch
            initialCity={initialCity}
            weatherResult={weatherResult}
          />
        </div>
        <WeatherNotices />
      </div>
      <BackgroundImage />
    </>
  )
}
