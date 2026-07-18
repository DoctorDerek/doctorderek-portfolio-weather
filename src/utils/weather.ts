const KELVIN_TO_CELSIUS_OFFSET = 273.15

export function convertKelvinToFahrenheit(temperatureKelvin: number) {
  return Math.round(
    ((temperatureKelvin - KELVIN_TO_CELSIUS_OFFSET) * 9) / 5 + 32,
  )
}
