"use client"

import dynamic from "next/dynamic"
import { useSyncExternalStore } from "react"
import { Toaster } from "react-hot-toast"
import BackgroundImage from "@/src/components/BackgroundImage"
import WeatherSearch from "@/src/components/WeatherSearch"
import type { WeatherResult } from "@/src/types/weather"

const WEATHER_ERROR_TOAST_DURATION_MILLISECONDS = 5000
const WEATHER_TOAST_DESKTOP_MEDIA_QUERY = "(min-width: 64rem)"

function subscribeToDesktopToastPlacement(onViewportChange: () => void) {
  const desktopViewport = window.matchMedia(WEATHER_TOAST_DESKTOP_MEDIA_QUERY)
  desktopViewport.addEventListener("change", onViewportChange)
  return () => desktopViewport.removeEventListener("change", onViewportChange)
}

const usesDesktopToastPlacement = () =>
  window.matchMedia(WEATHER_TOAST_DESKTOP_MEDIA_QUERY).matches

const getServerDesktopToastPlacement = () => false

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
  const desktopToastPlacement = useSyncExternalStore(
    subscribeToDesktopToastPlacement,
    usesDesktopToastPlacement,
    getServerDesktopToastPlacement,
  )

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
        <Toaster
          containerClassName="weather-notice-tray"
          position={desktopToastPlacement ? "top-center" : "bottom-center"}
          containerStyle={{
            top: "max(1rem, env(safe-area-inset-top, 0px))",
            right: "max(1rem, env(safe-area-inset-right, 0px))",
            bottom: "calc(1.5rem + env(safe-area-inset-bottom, 0px))",
            left: "max(1rem, env(safe-area-inset-left, 0px))",
          }}
          toastOptions={{
            duration: WEATHER_ERROR_TOAST_DURATION_MILLISECONDS,
            className:
              "pointer-events-none! min-h-14 w-full max-w-xl! justify-center gap-2 wrap-anywhere text-center lg:max-w-[min(var(--container-xl),50vw)]! lg:text-lg! [&>[aria-live]]:m-0! [&>[aria-live]]:flex-initial!",
          }}
        />
      </div>
      <BackgroundImage />
    </>
  )
}
