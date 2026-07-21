import ThemeToggleArtwork from "@/src/components/ThemeToggleArtwork"

const classNames = (...args: string[]) => args.filter(Boolean).join(" ")

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
      aria-label={
        isDarkTheme ? "Switch to light theme" : "Switch to dark theme"
      }
      className={classNames(
        "absolute top-4 right-4 z-20 inline-flex bg-transparent text-gray-900",
        "cursor-pointer rounded-[35px] border-0 p-0",
        isDarkTheme ? "theme-toggle--dark" : "theme-toggle--light",
      )}
      onClick={onToggle}
    >
      <ThemeToggleArtwork />
    </button>
  )
}
