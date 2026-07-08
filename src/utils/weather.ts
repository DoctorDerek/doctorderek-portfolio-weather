export function KtoF(tempKelvin: number) {
  return Math.round(((tempKelvin - 273.15) * 9) / 5 + 32)
}
