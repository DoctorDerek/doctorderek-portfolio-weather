const classNames = (...args: string[]) => args.filter(Boolean).join(" ")

export default function Card({
  children,
  heading,
}: {
  children?: React.ReactNode
  heading: string
}) {
  const useSmallFont = heading.length >= 12
  // large font: "MEMPHIS" and "LOS ANGELES"; small font: "PUERTO MORELOS"
  return (
    <div className="flex flex-col items-center justify-center">
      {/* take advantage of flex-shrink to generate auto-width <Card> */}
      <div className="mt-4 flex flex-col items-center justify-center rounded-lg bg-white p-3 text-gray-400 shadow-md drop-shadow-md dark:bg-black dark:text-gray-300 sm:mt-10">
        <h2
          className={classNames(
            useSmallFont ? "text-base" : "text-xl",
            "font-bold uppercase text-gray-600 dark:text-white",
          )}
        >
          {heading}
        </h2>
        {children && children}
      </div>
    </div>
  )
}
