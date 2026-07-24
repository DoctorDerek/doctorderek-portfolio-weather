import type { CSSProperties } from "react"
import ThemeToggleArtwork from "@/src/components/ThemeToggleArtwork"

const classNames = (...args: string[]) => args.filter(Boolean).join(" ")

export default function ThemeToggle({
  isDarkTheme,
  onToggle,
}: {
  isDarkTheme: boolean
  onToggle: () => void
}) {
  const themeButtonStyle: CSSProperties = {
    top: "max(1rem, env(safe-area-inset-top))",
    right: "max(1rem, env(safe-area-inset-right))",
  }

  return (
    <button
      type="button"
      aria-pressed={isDarkTheme}
      aria-label={
        isDarkTheme ? "Switch to light theme" : "Switch to dark theme"
      }
      data-testid="theme-toggle"
      style={themeButtonStyle}
      className={classNames(
        "fixed z-20 inline-flex bg-transparent text-gray-900",
        "cursor-pointer rounded-[35px] border-0 p-0",
        isDarkTheme ? "theme-toggle--dark" : "theme-toggle--light",
      )}
      onClick={onToggle}
    >
      <ThemeToggleArtwork />
    </button>
  )
}
