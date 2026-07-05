declare module "*.svg" {
  const content: React.FunctionComponent<React.SVGAttributes<SVGElement>>
  export default content
}

/** https://openweathermap.org/current#current_JSON */
type CurrentWeatherData = {
  coord: {
    /** lon: -122.08 */
    lon: number
    /** lat: 37.39 */
    lat: number
  }
  weather: [
    {
      /** id: 800 */
      id: number
      /** main: "Clear" */
      main: string
      /** description: "clear sky" */
      description: string
      /** icon: "01d" */
      icon: string
    },
  ]
  /** base: "stations" */
  base: string
  main: {
    /** temp: 282.55 */
    temp: number
    /** feels_like: 281.86 */
    feels_like: number
    /** temp_min: 280.37 */
    temp_min: number
    /** temp_max: 284.26 */
    temp_max: number
    /** pressure: 1023 */
    pressure: number
    /** humidity: 100 */
    humidity: number
  }
  /** visibility: 16093 */
  visibility: number
  wind: {
    /** speed: 1.5 */
    speed: number
    /** deg: 350 */
    deg: number
  }
  clouds: {
    /** all: 1 */
    all: number
  }
  /** dt: 1560350645 */
  dt: number
  sys: {
    /** type: 1 */
    type: number
    /** id: 5122 */
    id: number
    /** message: 0.0139 */
    message: number
    /** country: "US" */
    country: string
    /** sunrise: 1560343627 */
    sunrise: number
    /** sunset: 1560396563 */
    sunset: number
  }
  /** timezone: -25200 */
  timezone: number
  /** id: 420006353 */
  id: number
  /** name: "Mountain View" */
  name: string
  /** cod: 200 */
  cod: number

  /** message is used for errors, i.e. {cod: 404, message: "city not found"} */
  message?: string
}
