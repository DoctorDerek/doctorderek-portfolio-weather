import { resolveValue, useToaster } from "react-hot-toast/headless"

const ERROR_TOAST_DURATION_MS = 5000

export default function WeatherNotices() {
  const { toasts } = useToaster({ duration: ERROR_TOAST_DURATION_MS })
  return (
    <div
      data-weather-notices=""
      className="pointer-events-none relative z-20 flex flex-col items-center gap-2 pr-[max(--spacing(4),env(safe-area-inset-right))] pb-[max(--spacing(3),env(safe-area-inset-bottom))] pl-[max(--spacing(4),env(safe-area-inset-left))] empty:hidden lg:fixed lg:inset-x-0 lg:top-[max(--spacing(4),env(safe-area-inset-top))] lg:pb-0"
    >
      {toasts.map((notice) => (
        <div
          key={notice.id}
          data-visible={notice.visible}
          className="flex min-h-14 w-full max-w-xl items-center justify-center gap-2 rounded-lg bg-white px-2.5 py-2 text-center leading-[1.3] wrap-anywhere text-neutral-700 shadow-md data-[visible=false]:opacity-0 motion-safe:transition-[opacity,translate,scale] motion-safe:duration-350 motion-safe:ease-out motion-safe:data-[visible=false]:translate-y-full motion-safe:data-[visible=false]:scale-60 lg:max-w-[min(var(--container-xl),50vw)] lg:text-lg motion-safe:lg:data-[visible=false]:-translate-y-full motion-safe:starting:translate-y-full motion-safe:starting:scale-60 motion-safe:starting:opacity-0 motion-safe:lg:starting:-translate-y-full"
        >
          <span
            aria-hidden="true"
            className="relative grid size-5 shrink-0 place-items-center rounded-full bg-red-500 before:absolute before:h-0.5 before:w-3 before:rotate-45 before:rounded-full before:bg-white after:absolute after:h-0.5 after:w-3 after:-rotate-45 after:rounded-full after:bg-white"
          />
          <span {...notice.ariaProps} className="min-w-0 whitespace-pre-line">
            {resolveValue(notice.message, notice)}
          </span>
        </div>
      ))}
    </div>
  )
}
