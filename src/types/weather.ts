export type WeatherCoordinates = {
  latitude: number
  longitude: number
}

export type WeatherResult =
  | {
      status: "success"
      temperatureKelvin: number
      description: string
      icon: string
      locationName: string
    }
  | {
      status: "error"
      code: number
      message: string
    }
