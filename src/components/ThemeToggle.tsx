import ThemeToggleArtwork from "@/src/components/ThemeToggleArtwork"

export default function ThemeToggle({
  isDarkTheme,
  onToggle,
}: {
  isDarkTheme: boolean
  onToggle: () => void
}) {
  return (
    <button
      type="button"
      aria-pressed={isDarkTheme}
      aria-label={
        isDarkTheme ? "Switch to light theme" : "Switch to dark theme"
      }
      data-testid="theme-toggle"
      className="group/theme fixed top-[max(1rem,env(safe-area-inset-top))] right-[max(1rem,env(safe-area-inset-right))] z-20 inline-flex cursor-pointer rounded-full border-0 bg-transparent p-0 text-gray-900"
      onClick={onToggle}
    >
      <ThemeToggleArtwork />
    </button>
  )
}
