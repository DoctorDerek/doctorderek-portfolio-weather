export function normalizeCityQuery(city: string | null | undefined) {
  const normalizedCity = city?.trim()

  return normalizedCity || null
}
