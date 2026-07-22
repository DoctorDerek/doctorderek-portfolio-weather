"use client"

import { AnimatePresence, motion, useReducedMotion } from "motion/react"
import { useRouter, useSearchParams } from "next/navigation"
import { useCallback, useState } from "react"
import CityWeather from "@/src/components/CityWeather"
import LocationWeatherButton from "@/src/components/LocationWeatherButton"
import type { WeatherResult } from "@/src/types/weather"
import { normalizeCityQuery } from "@/src/utils/city"

type LocationWeatherState =
  | { status: "inactive" }
  | { status: "loading" }
  | { status: "complete"; weatherResult: WeatherResult }

const CURRENT_LOCATION_LABEL = "Current location"

export default function WeatherSearch({
  initialCity,
  weatherResult,
}: {
  initialCity: string | null
  weatherResult: WeatherResult | null
}) {
  const router = useRouter()
  const searchParameters = useSearchParams()
  const shouldReduceMotion = useReducedMotion()
  const [locationWeatherState, setLocationWeatherState] =
    useState<LocationWeatherState>({ status: "inactive" })

  const selectedCity = normalizeCityQuery(
    searchParameters.get("city") || searchParameters.get("q"),
  )
  const shouldDisplayLocationWeather =
    locationWeatherState.status !== "inactive" && !selectedCity
  const displayedCity =
    selectedCity ||
    (locationWeatherState.status === "inactive" ? initialCity : null)
  const cityInputValue = shouldDisplayLocationWeather
    ? ""
    : selectedCity || initialCity || ""
  const displayedWeather = shouldDisplayLocationWeather
    ? {
        city: CURRENT_LOCATION_LABEL,
        weatherResult:
          locationWeatherState.status === "complete"
            ? locationWeatherState.weatherResult
            : null,
      }
    : displayedCity
      ? {
          city: displayedCity,
          weatherResult: displayedCity === initialCity ? weatherResult : null,
        }
      : null

  const handleLocationWeatherLoading = useCallback(() => {
    if (selectedCity) {
      window.history.pushState(null, "", "/")
    }

    setLocationWeatherState({ status: "loading" })
  }, [selectedCity])

  const handleLocationWeatherResult = useCallback(
    (locationWeatherResult: WeatherResult) => {
      setLocationWeatherState({
        status: "complete",
        weatherResult: locationWeatherResult,
      })
    },
    [],
  )

  return (
    <main className="relative z-10 flex min-h-svh items-center justify-center px-4 py-24 sm:px-6 sm:py-20">
      <motion.section
        aria-labelledby="weather-workspace-title"
        className="w-full max-w-xl rounded-[2rem] border border-white/60 bg-white/70 p-5 shadow-2xl shadow-slate-900/20 ring-1 ring-black/5 backdrop-blur-xl sm:p-8 dark:border-white/15 dark:bg-slate-950/70 dark:shadow-black/50 dark:ring-white/5"
        initial={shouldReduceMotion ? false : { opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.35, ease: "easeOut" }}
      >
        <header className="mb-6 text-center">
          <p className="text-xs font-bold tracking-[0.22em] text-slate-700 uppercase dark:text-slate-200">
            Live conditions
          </p>
          <h1
            id="weather-workspace-title"
            className="mt-2 text-3xl font-semibold tracking-tight text-slate-950 sm:text-4xl dark:text-white"
          >
            Weather, right now
          </h1>
          <p className="mx-auto mt-2 max-w-sm text-sm leading-6 text-slate-700 dark:text-slate-200">
            Search a city or use your current location.
          </p>
        </header>

        <form
          className="space-y-2"
          onSubmit={(event) => {
            event.preventDefault()
            const formData = new FormData(event.currentTarget)
            const inputCity = normalizeCityQuery(String(formData.get("city")))

            if (!inputCity) return

            router.push(`/?city=${encodeURIComponent(inputCity)}`)
          }}
        >
          <label
            className="block text-sm font-semibold text-slate-900 dark:text-white"
            htmlFor="city"
          >
            City or place
          </label>
          <div className="flex">
            <input
              data-testid="weather-input"
              className="h-12 min-w-0 flex-1 rounded-l-xl border border-solid border-slate-300 bg-white/90 px-4 text-base text-slate-950 placeholder:text-slate-500 dark:border-white/20 dark:bg-slate-900/85 dark:text-white dark:placeholder:text-slate-400"
              type="text"
              name="city"
              id="city"
              placeholder="e.g. Mexico City"
              required
              pattern={".*\\S.*"}
              key={cityInputValue}
              defaultValue={cityInputValue}
            />
            <motion.button
              className="h-12 rounded-r-xl bg-blue-700 px-5 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-blue-800 dark:bg-blue-500 dark:hover:bg-blue-400"
              type="submit"
              whileHover={shouldReduceMotion ? undefined : { scale: 1.03 }}
              whileTap={shouldReduceMotion ? undefined : { scale: 0.97 }}
            >
              Search
            </motion.button>
          </div>
        </form>

        <div className="my-4 flex items-center gap-3" aria-hidden="true">
          <div className="h-px flex-1 bg-slate-500/30" />
          <span className="text-xs font-semibold text-slate-700 uppercase dark:text-slate-200">
            or
          </span>
          <div className="h-px flex-1 bg-slate-500/30" />
        </div>

        <LocationWeatherButton
          onLocationWeatherLoading={handleLocationWeatherLoading}
          onLocationWeatherResult={handleLocationWeatherResult}
          shouldReduceMotion={shouldReduceMotion ?? false}
        />

        <AnimatePresence initial={false} mode="wait">
          {displayedWeather ? (
            <motion.div
              key={displayedWeather.city}
              initial={shouldReduceMotion ? false : { opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={shouldReduceMotion ? undefined : { opacity: 0, y: -4 }}
              transition={{ duration: 0.2, ease: "easeOut" }}
            >
              <CityWeather
                city={displayedWeather.city}
                weatherResult={displayedWeather.weatherResult}
              />
            </motion.div>
          ) : null}
        </AnimatePresence>
      </motion.section>
    </main>
  )
}
