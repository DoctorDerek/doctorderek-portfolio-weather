export function convertKelvinToFahrenheit(temperatureKelvin: number) {
  return Math.round(((temperatureKelvin - 273.15) * 9) / 5 + 32)
}
