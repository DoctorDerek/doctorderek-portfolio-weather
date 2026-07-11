const classNames = (...args: string[]) => args.filter(Boolean).join(" ")

export default function Card({
  children,
  heading,
}: {
  children?: React.ReactNode
  heading: string
}) {
  const useSmallFont = heading.length >= 12

  return (
    <div className="flex flex-col items-center justify-center">
      <div className="mt-4 flex flex-col items-center justify-center rounded-lg bg-white p-3 text-gray-400 shadow-md drop-shadow-md sm:mt-10 dark:bg-black dark:text-gray-300">
        <h2
          className={classNames(
            useSmallFont ? "text-base" : "text-xl",
            "font-bold text-gray-600 uppercase dark:text-white",
          )}
        >
          {heading}
        </h2>
        {children && children}
      </div>
    </div>
  )
}
