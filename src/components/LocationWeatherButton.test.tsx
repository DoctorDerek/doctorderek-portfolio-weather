import { act, render, screen, waitFor } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import type { ButtonHTMLAttributes } from "react"
import type { GeolocatedConfig } from "react-geolocated"
import toast, { Toaster } from "react-hot-toast"
import { beforeEach, describe, expect, it, vi } from "vitest"
import LocationWeatherButton from "@/src/components/LocationWeatherButton"
import type { WeatherResult } from "@/src/types/weather"

const getCurrentLocationWeatherMock = vi.hoisted(() => vi.fn())
const getPositionMock = vi.hoisted(() => vi.fn())
const geolocationAvailability = vi.hoisted(() => ({ value: true }))
const geolocatedConfiguration = vi.hoisted(() => ({
  value: null as GeolocatedConfig | null,
}))
type PermissionQuery = () => Promise<{ state: PermissionState }>

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
  location: {
    name: "Mexico City",
    stateName: "Mexico City",
    countryCode: "MX",
  },
} satisfies WeatherResult

const ERROR_WEATHER_RESULT = {
  status: "error",
  code: 404,
  message: "service unavailable",
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

function setGeolocationPermissionState(
  newPermissionState: PermissionState | "unsupported",
  permissionQuery?: PermissionQuery,
) {
  if (newPermissionState === "unsupported") {
    Object.defineProperty(
      navigator as Navigator & { permissions?: unknown },
      "permissions",
      {
        configurable: true,
        value: undefined,
      },
    )
    return
  }

  const permissionQueryValue =
    permissionQuery ??
    vi.fn().mockResolvedValue({ state: newPermissionState } as {
      state: PermissionState
    })

  Object.defineProperty(navigator, "permissions", {
    configurable: true,
    value: { query: permissionQueryValue },
  })
}

function getCurrentGeolocatedConfiguration() {
  if (!geolocatedConfiguration.value) {
    throw new Error("Geolocation configuration was not initialized")
  }

  return geolocatedConfiguration.value
}

function renderLocationWeatherButton({
  shouldAutoFetchIfPermitted = false,
}: { shouldAutoFetchIfPermitted?: boolean } = {}) {
  const onLocationWeatherLoading = vi.fn()
  const onLocationWeatherResult = vi.fn()

  render(
    <>
      <Toaster />
      <LocationWeatherButton
        onLocationWeatherLoading={onLocationWeatherLoading}
        onLocationWeatherResult={onLocationWeatherResult}
        shouldReduceMotion={false}
        shouldAutoFetchIfPermitted={shouldAutoFetchIfPermitted}
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
    setGeolocationPermissionState("prompt")
    geolocationAvailability.value = true
    geolocatedConfiguration.value = null
  })

  it("waits for explicit consent and configures one low-power position", async () => {
    renderLocationWeatherButton()

    await waitFor(() => {
      expect(getCurrentGeolocatedConfiguration()).toBeDefined()
    })
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

  it("auto-fills on mount only when geolocation permission is already granted", async () => {
    setGeolocationPermissionState("granted")
    render(
      <>
        <Toaster />
        <LocationWeatherButton
          onLocationWeatherLoading={vi.fn()}
          onLocationWeatherResult={vi.fn()}
          shouldReduceMotion={false}
          shouldAutoFetchIfPermitted={true}
        />
      </>,
    )

    await waitFor(() => {
      expect(getPositionMock).toHaveBeenCalledOnce()
    })
    expect(
      screen.getByRole("button", { name: "Allow location access…" }),
    ).toBeDisabled()
  })

  it("does not auto-fill when geolocation permission is still pending", () => {
    setGeolocationPermissionState("prompt")
    renderLocationWeatherButton()

    expect(getPositionMock).not.toHaveBeenCalled()
    expect(
      screen.getByRole("button", { name: "Use my location" }),
    ).toBeEnabled()
  })

  it("does not auto-fetch when permission API is unavailable", () => {
    setGeolocationPermissionState("unsupported")
    renderLocationWeatherButton()

    expect(getPositionMock).not.toHaveBeenCalled()
  })

  it("does not auto-fetch on mount when permission is still pending", async () => {
    const permissionQuery = vi
      .fn()
      .mockResolvedValue({ state: "prompt" } as { state: PermissionState })
    setGeolocationPermissionState("prompt", permissionQuery)
    renderLocationWeatherButton({ shouldAutoFetchIfPermitted: true })

    await waitFor(() => {
      expect(permissionQuery).toHaveBeenCalledOnce()
    })
    expect(getPositionMock).not.toHaveBeenCalled()
  })

  it("does not auto-fetch when permission check throws", async () => {
    const permissionQuery = vi
      .fn()
      .mockRejectedValue(new Error("permission lookup unavailable"))
    setGeolocationPermissionState("granted", permissionQuery)
    renderLocationWeatherButton({ shouldAutoFetchIfPermitted: true })

    await waitFor(() => {
      expect(permissionQuery).toHaveBeenCalledOnce()
    })
    expect(getPositionMock).not.toHaveBeenCalled()
    expect(
      screen.getByRole("button", { name: "Use my location" }),
    ).toBeEnabled()
  })

  it("requests permission only after the location button is activated", async () => {
    const user = userEvent.setup()
    renderLocationWeatherButton()

    await user.click(screen.getByRole("button", { name: "Use my location" }))

    expect(getPositionMock).toHaveBeenCalledOnce()
    expect(
      screen.getByRole("button", { name: "Allow location access…" }),
    ).toBeDisabled()
  })

  it("keeps city search available when geolocation is unsupported", async () => {
    const user = userEvent.setup()
    geolocationAvailability.value = false
    renderLocationWeatherButton()

    await user.click(screen.getByRole("button", { name: "Use my location" }))

    expect(getPositionMock).not.toHaveBeenCalled()
    expect(await screen.findByRole("alert")).toHaveTextContent(
      "This browser doesn’t support location access. Please search by city.",
    )
  })

  it("recovers with an accessible message when permission is denied", async () => {
    const user = userEvent.setup()
    renderLocationWeatherButton()

    await user.click(screen.getByRole("button", { name: "Use my location" }))
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

  it.each([
    {
      code: 2,
      expectedMessage:
        "Your location is unavailable. Please try again or search by city.",
    },
    {
      code: 3,
      expectedMessage: "Finding your location took too long. Please try again.",
    },
    {
      code: undefined,
      expectedMessage:
        "Location permission took too long. Please try again or search by city.",
    },
  ])(
    "recovers from geolocation error code $code",
    async ({ code, expectedMessage }) => {
      const user = userEvent.setup()
      renderLocationWeatherButton()

      await user.click(screen.getByRole("button", { name: "Use my location" }))
      act(() => {
        getCurrentGeolocatedConfiguration().onError?.(
          code === undefined
            ? undefined
            : ({ code } as GeolocationPositionError),
        )
      })

      expect(await screen.findByRole("alert")).toHaveTextContent(
        expectedMessage,
      )
      expect(
        screen.getByRole("button", { name: "Use my location" }),
      ).toBeEnabled()
    },
  )

  it("rounds successful coordinates before loading server weather", async () => {
    const user = userEvent.setup()
    const { onLocationWeatherLoading, onLocationWeatherResult } =
      renderLocationWeatherButton()

    await user.click(screen.getByRole("button", { name: "Use my location" }))
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

    await user.click(screen.getByRole("button", { name: "Use my location" }))
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

  it("forwards weather API errors from the server action payload", async () => {
    const user = userEvent.setup()
    const { onLocationWeatherResult } = renderLocationWeatherButton()
    getCurrentLocationWeatherMock.mockResolvedValueOnce(ERROR_WEATHER_RESULT)

    await user.click(screen.getByRole("button", { name: "Use my location" }))
    act(() => {
      getCurrentGeolocatedConfiguration().onSuccess?.(TEST_POSITION)
    })

    await waitFor(() => {
      expect(onLocationWeatherResult).toHaveBeenCalledWith(ERROR_WEATHER_RESULT)
      expect(
        screen.getByRole("button", { name: "Use my location" }),
      ).toBeEnabled()
    })
  })
})
