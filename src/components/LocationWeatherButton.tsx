"use client"

import { motion } from "motion/react"
import { useCallback, useState } from "react"
import toast from "react-hot-toast"
import { useGeolocated } from "react-geolocated"
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
    <div className="mt-3 flex flex-col items-center gap-1">
      <motion.button
        className="rounded-lg border border-[#4683c8] bg-white/90 px-4 py-2 text-xs font-bold text-[#2f679e] uppercase shadow-sm disabled:cursor-wait disabled:opacity-70 dark:bg-black/90 dark:text-blue-300"
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
        className="px-4 text-center text-xs text-gray-700 dark:text-gray-200"
      >
        Your location is used once and isn’t stored.
      </p>
    </div>
  )
}
