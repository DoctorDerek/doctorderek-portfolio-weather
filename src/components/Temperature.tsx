export default function Temperature({
  degreesF,
}: {
  degreesF: string | number
}) {
  return (
    <div className="text-xs">
      Temperature:
      <span className="ml-2 text-3xl font-semibold tracking-tighter text-black dark:text-white">
        {degreesF} °F
      </span>
    </div>
  )
}
