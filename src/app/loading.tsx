export default function Loading() {
  return (
    <main className="relative z-10 flex min-h-svh items-center justify-center px-4 py-24 sm:px-6 sm:py-20">
      <section
        aria-labelledby="weather-loading-title"
        className="w-full max-w-xl rounded-[2rem] border border-white/60 bg-white/70 p-5 shadow-2xl ring-1 shadow-slate-900/20 ring-black/5 backdrop-blur-xl sm:p-8 dark:border-white/15 dark:bg-slate-950/70 dark:shadow-black/50 dark:ring-white/5"
      >
        <h2
          id="weather-loading-title"
          className="mb-4 text-center text-lg font-semibold text-slate-950 dark:text-white"
        >
          Preparing your forecast
        </h2>
        <p
          role="status"
          aria-live="polite"
          className="text-center text-sm text-slate-700 dark:text-slate-200"
        >
          Fetching current weather...
        </p>
      </section>
    </main>
  )
}
