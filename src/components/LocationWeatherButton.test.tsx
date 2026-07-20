import { act, render, screen, waitFor } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import type { ButtonHTMLAttributes } from "react"
import toast, { Toaster } from "react-hot-toast"
import type { GeolocatedConfig } from "react-geolocated"
import { beforeEach, describe, expect, it, vi } from "vitest"
import LocationWeatherButton from "@/src/components/LocationWeatherButton"
import type { WeatherResult } from "@/src/types/weather"

const getCurrentLocationWeatherMock = vi.hoisted(() => vi.fn())
const getPositionMock = vi.hoisted(() => vi.fn())
const geolocationAvailability = vi.hoisted(() => ({ value: true }))
const geolocatedConfiguration = vi.hoisted(() => ({
  value: null as GeolocatedConfig | null,
}))

vi.mock("@/src/actions/getCurrentLocationWeather", () => ({
  getCurrentLocationWeather: getCurrentLocationWeatherMock,
}))

vi.mock("react-geolocated", () => ({
  useGeolocated: (configuration: GeolocatedConfig) => {
    geolocatedConfiguration.value = configuration

    return {
      coords: undefined,
      timestamp: undefined,
      isGeolocationAvailable: geolocationAvailability.value,
      isGeolocationEnabled: false,
      positionError: undefined,
      getPosition: getPositionMock,
    }
  },
}))

vi.mock("motion/react", () => ({
  motion: {
    button: ({
      children,
      whileHover: _whileHover,
      whileTap: _whileTap,
      ...buttonProperties
    }: ButtonHTMLAttributes<HTMLButtonElement> & {
      whileHover?: { scale: number }
      whileTap?: { scale: number }
    }) => <button {...buttonProperties}>{children}</button>,
  },
}))

const SUCCESSFUL_WEATHER_RESULT = {
  status: "success",
  temperatureKelvin: 300.15,
  description: "clear sky",
  icon: "01d",
  locationName: "Mexico City",
} satisfies WeatherResult

const TEST_POSITION = {
  coords: {
    latitude: 19.432_608,
    longitude: -99.133_209,
    accuracy: 10,
    altitude: null,
    altitudeAccuracy: null,
    heading: null,
    speed: null,
    toJSON: () => ({}),
  },
  timestamp: 1_700_000_000_000,
  toJSON: () => ({}),
} satisfies GeolocationPosition

function getCurrentGeolocatedConfiguration() {
  if (!geolocatedConfiguration.value) {
    throw new Error("Geolocation configuration was not initialized")
  }

  return geolocatedConfiguration.value
}

function renderLocationWeatherButton() {
  const onLocationWeatherLoading = vi.fn()
  const onLocationWeatherResult = vi.fn()

  render(
    <>
      <Toaster />
      <LocationWeatherButton
        onLocationWeatherLoading={onLocationWeatherLoading}
        onLocationWeatherResult={onLocationWeatherResult}
        shouldReduceMotion={false}
      />
    </>,
  )

  return { onLocationWeatherLoading, onLocationWeatherResult }
}

describe("LocationWeatherButton", () => {
  beforeEach(() => {
    toast.remove()
    getCurrentLocationWeatherMock.mockReset()
    getCurrentLocationWeatherMock.mockResolvedValue(SUCCESSFUL_WEATHER_RESULT)
    getPositionMock.mockReset()
    geolocationAvailability.value = true
    geolocatedConfiguration.value = null
  })

  it("waits for explicit consent and configures one low-power position", () => {
    renderLocationWeatherButton()

    expect(getPositionMock).not.toHaveBeenCalled()
    expect(getCurrentGeolocatedConfiguration()).toMatchObject({
      positionOptions: {
        enableHighAccuracy: false,
        maximumAge: 300_000,
        timeout: 10_000,
      },
      suppressLocationOnMount: true,
      watchPosition: false,
      watchLocationPermissionChange: false,
      isOptimisticGeolocationEnabled: false,
      userDecisionTimeout: 30_000,
    })
    expect(
      screen.getByText("Your location is used once and isn’t stored."),
    ).toBeVisible()
  })

  it("requests permission only after the location button is activated", async () => {
    const user = userEvent.setup()
    renderLocationWeatherButton()

    await user.click(
      screen.getByRole("button", { name: "Use my location" }),
    )

    expect(getPositionMock).toHaveBeenCalledOnce()
    expect(
      screen.getByRole("button", { name: "Allow location access…" }),
    ).toBeDisabled()
  })

  it("keeps city search available when geolocation is unsupported", async () => {
    const user = userEvent.setup()
    geolocationAvailability.value = false
    renderLocationWeatherButton()

    await user.click(
      screen.getByRole("button", { name: "Use my location" }),
    )

    expect(getPositionMock).not.toHaveBeenCalled()
    expect(await screen.findByRole("alert")).toHaveTextContent(
      "This browser doesn’t support location access. Please search by city.",
    )
  })

  it("recovers with an accessible message when permission is denied", async () => {
    const user = userEvent.setup()
    renderLocationWeatherButton()

    await user.click(
      screen.getByRole("button", { name: "Use my location" }),
    )
    act(() => {
      getCurrentGeolocatedConfiguration().onError?.({
        code: 1,
      } as GeolocationPositionError)
    })

    expect(await screen.findByRole("alert")).toHaveTextContent(
      "Location access was denied. You can still search by city.",
    )
    expect(
      screen.getByRole("button", { name: "Use my location" }),
    ).toBeEnabled()
  })

  it("rounds successful coordinates before loading server weather", async () => {
    const user = userEvent.setup()
    const { onLocationWeatherLoading, onLocationWeatherResult } =
      renderLocationWeatherButton()

    await user.click(
      screen.getByRole("button", { name: "Use my location" }),
    )
    act(() => {
      getCurrentGeolocatedConfiguration().onSuccess?.(TEST_POSITION)
    })

    expect(onLocationWeatherLoading).toHaveBeenCalledOnce()
    expect(
      screen.getByRole("button", { name: "Loading local weather…" }),
    ).toBeDisabled()
    await waitFor(() => {
      expect(getCurrentLocationWeatherMock).toHaveBeenCalledWith({
        latitude: 19.43,
        longitude: -99.13,
      })
      expect(onLocationWeatherResult).toHaveBeenCalledWith(
        SUCCESSFUL_WEATHER_RESULT,
      )
    })
    expect(
      screen.getByRole("button", { name: "Use my location" }),
    ).toBeEnabled()
  })

  it("turns transport failures into typed weather errors", async () => {
    const user = userEvent.setup()
    const { onLocationWeatherResult } = renderLocationWeatherButton()
    getCurrentLocationWeatherMock.mockRejectedValue(
      new Error("Server action unavailable"),
    )

    await user.click(
      screen.getByRole("button", { name: "Use my location" }),
    )
    act(() => {
      getCurrentGeolocatedConfiguration().onSuccess?.(TEST_POSITION)
    })

    await waitFor(() => {
      expect(onLocationWeatherResult).toHaveBeenCalledWith({
        status: "error",
        code: 500,
        message: "Server action unavailable",
      })
    })
  })
})
