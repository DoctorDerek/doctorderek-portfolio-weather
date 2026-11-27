"use client"

import { AnimatePresence, motion, useReducedMotion } from "motion/react"
import { useRouter, useSearchParams } from "next/navigation"
import {
  startTransition,
  useCallback,
  useEffect,
  useOptimistic,
  useRef,
  useState,
} from "react"
import type { FormEvent } from "react"
import CityWeather from "@/src/components/CityWeather"
import LocationWeatherButton from "@/src/components/LocationWeatherButton"
import type { WeatherResult } from "@/src/types/weather"
import { normalizeCityQuery } from "@/src/utils/city"

type LocationWeatherState =
  | { status: "inactive" }
  | { status: "loading" }
  | { status: "complete"; weatherResult: WeatherResult }

export default function WeatherSearch({
  initialCity,
  weatherResult,
}: {
  initialCity: string | null
  weatherResult: WeatherResult | null
}) {
  const submittedSearch = useRef<{
    city: string
    form: HTMLFormElement
  } | null>(null)
  const requestedWeatherSource = useRef<"city" | "location">("location")
  const router = useRouter()
  const searchParameters = useSearchParams()
  const shouldReduceMotion = useReducedMotion()
  const [locationWeatherState, setLocationWeatherState] =
    useState<LocationWeatherState>({ status: "inactive" })
  const [pendingCity, setPendingCity] = useOptimistic<string | null>(null)

  const selectedCity = normalizeCityQuery(
    searchParameters.get("city") || searchParameters.get("q"),
  )
  const cityInputValue =
    selectedCity ||
    (locationWeatherState.status === "inactive" ? initialCity : null) ||
    ""
  const syncCityInput = useCallback(
    (input: HTMLInputElement | null) => {
      if (input && submittedSearch.current?.city !== cityInputValue) {
        input.value = cityInputValue
      }
    },
    [cityInputValue],
  )
  const displayedCity = pendingCity || cityInputValue
  const displayedWeather = displayedCity
    ? {
        city: displayedCity,
        weatherResult:
          !pendingCity && displayedCity === initialCity ? weatherResult : null,
      }
    : locationWeatherState.status !== "inactive"
      ? {
          city: null,
          weatherResult:
            locationWeatherState.status === "complete"
              ? locationWeatherState.weatherResult
              : null,
        }
      : null

  useEffect(() => {
    const search = submittedSearch.current
    if (
      !search ||
      search.city !== selectedCity ||
      search.city !== initialCity ||
      !weatherResult
    )
      return
    submittedSearch.current = null
    const viewport = search.form.closest<HTMLElement>("[data-search-viewport]")
    if (
      weatherResult.status !== "error" ||
      !viewport ||
      getComputedStyle(viewport).display === "contents"
    )
      return

    const observer = new ResizeObserver(() => {
      const frame = viewport.parentElement
      if (!frame || viewport.clientHeight >= frame.clientHeight) return
      const form = search.form.getBoundingClientRect()
      const available = viewport.getBoundingClientRect()
      if (form.top < available.top || form.bottom > available.bottom)
        search.form.scrollIntoView({ block: "nearest", behavior: "instant" })
      observer.disconnect()
    })
    observer.observe(viewport)
    return () => observer.disconnect()
  }, [initialCity, selectedCity, weatherResult])

  const handleLocationWeatherRequest = useCallback(() => {
    requestedWeatherSource.current = "location"
  }, [])

  const handleLocationWeatherLoading = useCallback(() => {
    if (requestedWeatherSource.current !== "location") return false
    submittedSearch.current = null
    if (selectedCity) {
      window.history.pushState(null, "", "/")
    }

    if (pendingCity) {
      startTransition(() => {
        setPendingCity(null)
        router.replace("/", { scroll: false })
      })
    }
    setLocationWeatherState({ status: "loading" })
    return true
  }, [pendingCity, router, selectedCity, setPendingCity])

  const handleLocationWeatherResult = useCallback(
    (locationWeatherResult: WeatherResult) => {
      setLocationWeatherState({
        status: "complete",
        weatherResult: locationWeatherResult,
      })
    },
    [],
  )

  const handleWeatherSearchSubmit = useCallback(
    (event: FormEvent<HTMLFormElement>) => {
      event.preventDefault()
      const formData = new FormData(event.currentTarget)
      const inputCity = normalizeCityQuery(String(formData.get("city")))

      if (!inputCity) return
      requestedWeatherSource.current = "city"
      submittedSearch.current = { city: inputCity, form: event.currentTarget }
      if (inputCity === selectedCity) {
        router.refresh()
        return
      }

      startTransition(() => {
        setPendingCity(inputCity)
        router.push(`/?city=${encodeURIComponent(inputCity)}`, {
          scroll: false,
        })
      })
    },
    [router, selectedCity, setPendingCity],
  )
  const shouldAutoDetectLocation =
    !pendingCity && !selectedCity && locationWeatherState.status === "inactive"

  return (
    <main
      data-forecast-ready={
        displayedWeather?.weatherResult?.status === "success" || undefined
      }
      className="forecast-fit:pt-23 forecast-fit:pb-3 relative z-10 flex min-h-full items-center justify-center px-4 pt-24 pb-4 sm:px-6 sm:py-20 lg:min-h-svh"
    >
      <section
        aria-labelledby="weather-workspace-title"
        data-testid="weather-workspace"
        className="forecast-fit:p-3 flex w-full max-w-xl min-w-0 flex-col gap-3 rounded-[2rem] border border-white/60 bg-white/70 p-5 wrap-anywhere shadow-2xl ring-1 shadow-slate-900/20 ring-black/5 backdrop-blur-xl sm:p-8 dark:border-white/15 dark:bg-slate-950/70 dark:shadow-black/50 dark:ring-white/5"
      >
        <header className="order-first text-center">
          <h1
            id="weather-workspace-title"
            className="text-3xl font-semibold tracking-tight text-slate-950 sm:text-4xl dark:text-white"
          >
            Weather, right now
          </h1>
        </header>

        <form
          className="space-y-2"
          data-testid="weather-search-form"
          onSubmit={handleWeatherSearchSubmit}
        >
          <label
            className="block text-sm font-semibold text-slate-900 dark:text-white"
            htmlFor="city"
          >
            City or place
          </label>
          <div className="flex flex-wrap gap-2">
            <input
              data-testid="weather-input"
              className="h-12 min-w-0 flex-1 basis-32 rounded-xl border border-solid border-slate-300 bg-white/90 px-4 text-base text-slate-950 placeholder:text-slate-500 dark:border-white/20 dark:bg-slate-900/85 dark:text-white dark:placeholder:text-slate-400"
              type="text"
              name="city"
              id="city"
              placeholder="e.g. San Francisco"
              required
              pattern={".*\\S.*"}
              ref={syncCityInput}
              defaultValue={cityInputValue}
            />
            <motion.button
              data-testid="weather-search-submit"
              className="h-12 max-w-full rounded-xl bg-blue-700 px-4 text-sm font-semibold text-white shadow-sm transition-[color,background-color,border-color] hover:bg-blue-800 disabled:cursor-wait disabled:opacity-70 dark:bg-blue-500 dark:hover:bg-blue-400"
              type="submit"
              disabled={pendingCity !== null}
              aria-busy={pendingCity !== null}
              whileHover={shouldReduceMotion ? undefined : { scale: 1.03 }}
              whileTap={shouldReduceMotion ? undefined : { scale: 0.97 }}
            >
              Search
            </motion.button>
          </div>
        </form>

        <LocationWeatherButton
          onLocationWeatherRequest={handleLocationWeatherRequest}
          onLocationWeatherLoading={handleLocationWeatherLoading}
          onLocationWeatherResult={handleLocationWeatherResult}
          shouldAutoFetchIfPermitted={shouldAutoDetectLocation}
          shouldReduceMotion={shouldReduceMotion ?? false}
        />

        <AnimatePresence initial={false}>
          {displayedWeather ? (
            <motion.div
              key="forecast"
              className="-order-1 xl:order-last"
              data-testid="forecast-transition"
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
      </section>
    </main>
  )
}
