export default function Temperature({
  temperatureCelsius,
  temperatureFahrenheit,
}: {
  temperatureCelsius: number
  temperatureFahrenheit: number
}) {
  return (
    <div className="text-xs">
      Temperature:
      <span className="ml-2 text-2xl font-semibold tracking-tighter whitespace-nowrap text-black sm:text-3xl dark:text-white">
        <span>{temperatureFahrenheit} °F</span>
        <span aria-hidden="true"> / </span>
        <span>{temperatureCelsius} °C</span>
      </span>
    </div>
  )
}
