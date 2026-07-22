export const OPEN_WEATHER_MAP_TEST_API_KEY = "test-open-weather-map-api-key"
export const OPEN_WEATHER_MAP_TEST_CITY = "Mexico City"
export const OPEN_WEATHER_MAP_TEST_COORDINATES = {
  latitude: 19.43,
  longitude: -99.13,
}

export const OPEN_WEATHER_MAP_GEOCODING_RESPONSE_FIXTURE = [
  {
    name: OPEN_WEATHER_MAP_TEST_CITY,
    state: "Mexico City",
    country: "MX",
    lat: OPEN_WEATHER_MAP_TEST_COORDINATES.latitude,
    lon: OPEN_WEATHER_MAP_TEST_COORDINATES.longitude,
  },
]

export const OPEN_WEATHER_MAP_SUCCESS_RESPONSE_FIXTURE = {
  name: OPEN_WEATHER_MAP_TEST_CITY,
  sys: {
    country: "MX",
  },
  main: {
    temp: 300.15,
  },
  weather: [
    {
      description: "clear sky",
      icon: "01d",
    },
  ],
}

export const OPEN_WEATHER_MAP_ERROR_RESPONSE_FIXTURE = {
  message: "city not found",
}
