"use client"

import { motion, useReducedMotion } from "motion/react"
import { useRouter } from "next/navigation"
import { useCallback, useState } from "react"
import CityWeather from "@/src/components/CityWeather"
import LocationWeatherButton from "@/src/components/LocationWeatherButton"
import type { WeatherResult } from "@/src/types/weather"

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
  const shouldReduceMotion = useReducedMotion()
  const [locationWeatherState, setLocationWeatherState] =
    useState<LocationWeatherState>({ status: "inactive" })

  const handleLocationWeatherLoading = useCallback(() => {
    setLocationWeatherState({ status: "loading" })
  }, [])

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
    <div className="relative z-10 flex h-[90vh] flex-col justify-end py-10 sm:justify-start">
      <form
        className="flex flex-wrap items-center justify-center"
        onSubmit={(event) => {
          event.preventDefault()
          const formData = new FormData(event.currentTarget)
          const inputCity = String(formData.get("city"))
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
          <motion.button
            className="h-10 rounded-r-lg bg-[#4683c8] p-2 text-xs font-bold text-white uppercase"
            type="submit"
            whileHover={shouldReduceMotion ? undefined : { scale: 1.03 }}
            whileTap={shouldReduceMotion ? undefined : { scale: 0.97 }}
          >
            Submit
          </motion.button>
        </div>
      </form>

      <LocationWeatherButton
        onLocationWeatherLoading={handleLocationWeatherLoading}
        onLocationWeatherResult={handleLocationWeatherResult}
        shouldReduceMotion={shouldReduceMotion ?? false}
      />

      {locationWeatherState.status !== "inactive" ? (
        <CityWeather
          city={CURRENT_LOCATION_LABEL}
          weatherResult={
            locationWeatherState.status === "complete"
              ? locationWeatherState.weatherResult
              : null
          }
        />
      ) : initialCity ? (
        <CityWeather city={initialCity} weatherResult={weatherResult} />
      ) : null}
    </div>
  )
}
