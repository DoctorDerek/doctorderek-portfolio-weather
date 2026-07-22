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
      className="mt-4 grid w-full max-w-xs grid-cols-2 divide-x divide-slate-300 overflow-hidden rounded-xl border border-slate-200 bg-white/55 text-center dark:divide-white/10 dark:border-white/10 dark:bg-black/15"
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
