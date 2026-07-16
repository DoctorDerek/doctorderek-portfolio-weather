export type WeatherResult =
  | {
      status: "success"
      temperatureKelvin: number
      description: string
      icon: string
    }
  | {
      status: "error"
      code: number
      message: string
    }
