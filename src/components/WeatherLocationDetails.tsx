import type { WeatherLocation } from "@/src/types/weather"
import { getCountryName } from "@/src/utils/country"

export default function WeatherLocationDetails({
  location,
}: {
  location: WeatherLocation
}) {
  return (
    <dl
      aria-label="Location details"
      className="mt-1 flex flex-wrap items-center justify-center gap-1.5 text-xs font-medium text-gray-500"
    >
      {location.stateName ? (
        <div className="rounded-full bg-gray-100 px-2 py-1 dark:bg-white/10">
          <dt className="sr-only">State or region</dt>
          <dd>{location.stateName}</dd>
        </div>
      ) : null}
      <div className="rounded-full bg-gray-100 px-2 py-1 dark:bg-white/10">
        <dt className="sr-only">Country</dt>
        <dd>{getCountryName(location.countryCode)}</dd>
      </div>
    </dl>
  )
}
