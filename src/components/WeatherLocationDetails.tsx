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
      className="mt-2 flex flex-wrap items-center justify-center gap-1.5 text-xs font-medium text-slate-600 dark:text-slate-300"
    >
      {location.stateName ? (
        <div className="rounded-full border border-slate-200 bg-white/60 px-2.5 py-1 dark:border-white/10 dark:bg-white/5">
          <dt className="sr-only">State or region</dt>
          <dd>{location.stateName}</dd>
        </div>
      ) : null}
      <div className="rounded-full border border-slate-200 bg-white/60 px-2.5 py-1 dark:border-white/10 dark:bg-white/5">
        <dt className="sr-only">Country</dt>
        <dd>{getCountryName(location.countryCode)}</dd>
      </div>
    </dl>
  )
}
