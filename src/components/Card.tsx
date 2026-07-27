import { motion } from "motion/react"

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
      className="mt-6 flex w-full flex-col items-center justify-center"
      role={ariaLive ? "status" : undefined}
      aria-live={ariaLive}
      aria-atomic={ariaLive ? true : undefined}
    >
      <motion.div
        initial={{ y: 8 }}
        animate={{ y: 0 }}
        transition={{ duration: 0.2 }}
        className="flex w-full flex-col items-center justify-center rounded-2xl border border-white/70 bg-white/65 p-5 text-slate-600 shadow-lg shadow-slate-900/10 backdrop-blur-md dark:border-white/10 dark:bg-slate-900/70 dark:text-slate-300 dark:shadow-black/25"
      >
        <h2
          className={classNames(
            useSmallFont ? "text-xl" : "text-2xl",
            "text-center font-semibold tracking-tight text-slate-950 dark:text-white",
          )}
        >
          {heading}
        </h2>
        {children}
      </motion.div>
    </div>
  )
}
