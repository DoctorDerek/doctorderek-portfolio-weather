export type WeatherCoordinates = {
  latitude: number
  longitude: number
}

export type WeatherLocation = {
  name: string
  stateName: string | null
  countryCode: string
}

export type WeatherResult =
  | {
      status: "success"
      temperatureKelvin: number
      description: string
      icon: string
      location: WeatherLocation
    }
  | {
      status: "error"
      code: number
      message: string
    }
