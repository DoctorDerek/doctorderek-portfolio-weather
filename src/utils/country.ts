const ENGLISH_REGION_NAMES = new Intl.DisplayNames(["en"], {
  type: "region",
})

export function getCountryName(countryCode: string) {
  const normalizedCountryCode = countryCode.toUpperCase()
  return ENGLISH_REGION_NAMES.of(normalizedCountryCode) ?? normalizedCountryCode
}
