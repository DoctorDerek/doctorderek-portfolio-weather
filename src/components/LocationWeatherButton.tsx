"use client"

import { motion } from "motion/react"
import { useCallback, useState } from "react"
import { useGeolocated } from "react-geolocated"
import toast from "react-hot-toast"
import { getCurrentLocationWeather } from "@/src/actions/getCurrentLocationWeather"
import type { WeatherResult } from "@/src/types/weather"
import { getErrorMessage } from "@/src/utils/error"
import { roundWeatherCoordinates } from "@/src/utils/weatherCoordinates"

const LOCATION_POSITION_TIMEOUT_MILLISECONDS = 10_000
const LOCATION_PERMISSION_TIMEOUT_MILLISECONDS = 30_000
const LOCATION_POSITION_MAXIMUM_AGE_MILLISECONDS = 300_000
const GEOLOCATION_PERMISSION_DENIED_CODE = 1
const GEOLOCATION_POSITION_UNAVAILABLE_CODE = 2
const GEOLOCATION_POSITION_TIMEOUT_CODE = 3
const LOCATION_ERROR_TOAST_ID = "location-access-error"

type LocationRequestPhase = "idle" | "requesting" | "loading"

function getLocationErrorMessage(positionError?: GeolocationPositionError) {
  switch (positionError?.code) {
    case GEOLOCATION_PERMISSION_DENIED_CODE:
      return "Location access was denied. You can still search by city."
    case GEOLOCATION_POSITION_UNAVAILABLE_CODE:
      return "Your location is unavailable. Please try again or search by city."
    case GEOLOCATION_POSITION_TIMEOUT_CODE:
      return "Finding your location took too long. Please try again."
    default:
      return "Location permission took too long. Please try again or search by city."
  }
}

export default function LocationWeatherButton({
  onLocationWeatherLoading,
  onLocationWeatherResult,
  shouldReduceMotion,
}: {
  onLocationWeatherLoading: () => void
  onLocationWeatherResult: (weatherResult: WeatherResult) => void
  shouldReduceMotion: boolean
}) {
  const [locationRequestPhase, setLocationRequestPhase] =
    useState<LocationRequestPhase>("idle")

  const handleLocationError = useCallback(
    (positionError?: GeolocationPositionError) => {
      setLocationRequestPhase("idle")
      toast.error(getLocationErrorMessage(positionError), {
        id: LOCATION_ERROR_TOAST_ID,
        ariaProps: {
          role: "alert",
          "aria-live": "assertive",
        },
      })
    },
    [],
  )

  const handleLocationSuccess = useCallback(
    async (position: GeolocationPosition) => {
      setLocationRequestPhase("loading")
      onLocationWeatherLoading()

      try {
        const weatherResult = await getCurrentLocationWeather(
          roundWeatherCoordinates({
            latitude: position.coords.latitude,
            longitude: position.coords.longitude,
          }),
        )
        onLocationWeatherResult(weatherResult)
      } catch (error: unknown) {
        onLocationWeatherResult({
          status: "error",
          code: 500,
          message: getErrorMessage(error),
        })
      } finally {
        setLocationRequestPhase("idle")
      }
    },
    [onLocationWeatherLoading, onLocationWeatherResult],
  )

  const { getPosition, isGeolocationAvailable } = useGeolocated({
    positionOptions: {
      enableHighAccuracy: false,
      maximumAge: LOCATION_POSITION_MAXIMUM_AGE_MILLISECONDS,
      timeout: LOCATION_POSITION_TIMEOUT_MILLISECONDS,
    },
    suppressLocationOnMount: true,
    watchPosition: false,
    watchLocationPermissionChange: false,
    isOptimisticGeolocationEnabled: false,
    userDecisionTimeout: LOCATION_PERMISSION_TIMEOUT_MILLISECONDS,
    onError: handleLocationError,
    onSuccess: (position) => {
      void handleLocationSuccess(position)
    },
  })

  const isLocationRequestPending = locationRequestPhase !== "idle"
  const buttonLabel =
    locationRequestPhase === "requesting"
      ? "Allow location access…"
      : locationRequestPhase === "loading"
        ? "Loading local weather…"
        : "Use my location"

  return (
    <div className="flex flex-col items-stretch gap-2">
      <motion.button
        className="h-12 w-full rounded-xl border border-blue-700/30 bg-blue-50/80 px-4 text-sm font-semibold text-blue-900 shadow-sm transition-colors hover:bg-blue-100 disabled:cursor-wait disabled:opacity-70 dark:border-blue-300/30 dark:bg-blue-400/10 dark:text-blue-200 dark:hover:bg-blue-400/20"
        type="button"
        disabled={isLocationRequestPending}
        aria-busy={isLocationRequestPending}
        aria-describedby="location-privacy-note"
        whileHover={
          shouldReduceMotion || isLocationRequestPending
            ? undefined
            : { scale: 1.03 }
        }
        whileTap={
          shouldReduceMotion || isLocationRequestPending
            ? undefined
            : { scale: 0.97 }
        }
        onClick={() => {
          if (!isGeolocationAvailable) {
            toast.error(
              "This browser doesn’t support location access. Please search by city.",
              {
                id: LOCATION_ERROR_TOAST_ID,
                ariaProps: {
                  role: "alert",
                  "aria-live": "assertive",
                },
              },
            )
            return
          }

          setLocationRequestPhase("requesting")
          getPosition()
        }}
      >
        <span aria-live="polite">{buttonLabel}</span>
      </motion.button>
      <p
        id="location-privacy-note"
        className="px-4 text-center text-xs leading-5 text-slate-700 dark:text-slate-300"
      >
        Your location is used once and isn’t stored.
      </p>
    </div>
  )
}
