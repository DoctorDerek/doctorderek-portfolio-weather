export default function Temperature({
  temperatureCelsius,
  temperatureFahrenheit,
}: {
  temperatureCelsius: number
  temperatureFahrenheit: number
}) {
  return (
    <dl
      aria-label="Temperature"
      className="forecast-fit:order-none forecast-fit:col-span-full forecast-fit:row-start-2 forecast-fit:mt-1 forecast-fit:[&>div]:p-1.5 order-last mt-4 grid w-full max-w-xs grid-cols-2 divide-x divide-slate-300 overflow-hidden rounded-xl border border-slate-200 bg-white/55 text-center dark:divide-white/10 dark:border-white/10 dark:bg-black/15"
    >
      <div className="px-3 py-3">
        <dt className="text-[0.65rem] font-bold tracking-[0.12em] text-slate-500 uppercase dark:text-slate-400">
          Fahrenheit
        </dt>
        <dd className="mt-1 text-3xl font-semibold tracking-tight text-slate-950 dark:text-white">
          {temperatureFahrenheit} °F
        </dd>
      </div>
      <div className="px-3 py-3">
        <dt className="text-[0.65rem] font-bold tracking-[0.12em] text-slate-500 uppercase dark:text-slate-400">
          Celsius
        </dt>
        <dd className="mt-1 text-3xl font-semibold tracking-tight text-slate-950 dark:text-white">
          {temperatureCelsius} °C
        </dd>
      </div>
    </dl>
  )
}
