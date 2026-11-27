const classNames = (...args: string[]) => args.filter(Boolean).join(" ")

export default function Card({
  children,
  heading,
  ariaLive,
}: {
  children?: React.ReactNode
  heading: string
  ariaLive?: React.AriaAttributes["aria-live"]
}) {
  const useSmallFont = heading.length >= 18

  return (
    <div
      className="flex w-full min-w-0 flex-col items-center justify-center wrap-anywhere"
      role={
        ariaLive ? (ariaLive === "assertive" ? "alert" : "status") : undefined
      }
      aria-live={ariaLive}
      aria-atomic={ariaLive ? true : undefined}
    >
      <div className="forecast-fit:grid forecast-fit:grid-cols-[auto_minmax(0,1fr)] forecast-fit:justify-items-center forecast-fit:gap-x-2 forecast-fit:p-3 flex w-full flex-col items-center justify-center rounded-2xl border border-white/70 bg-white/65 p-5 text-slate-600 shadow-lg shadow-slate-900/10 backdrop-blur-md dark:border-white/10 dark:bg-slate-900/70 dark:text-slate-300 dark:shadow-black/25">
        <h2
          className={classNames(
            useSmallFont ? "text-xl" : "text-2xl",
            "forecast-fit:col-span-full text-center font-semibold tracking-tight text-slate-950 dark:text-white",
          )}
        >
          {heading}
        </h2>
        {children}
      </div>
    </div>
  )
}
