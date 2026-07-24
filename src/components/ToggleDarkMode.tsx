"use client"

import { useTheme } from "next-themes"
import ThemeToggle from "@/src/components/ThemeToggle"

export default function ToggleDarkMode() {
  const { resolvedTheme, theme, setTheme } = useTheme()
  const effectiveTheme = resolvedTheme ?? theme
  const isDarkTheme = effectiveTheme === "dark"
  const isThemeSettled = isDarkTheme || effectiveTheme === "light"

  if (!isThemeSettled) {
    return null
  }

  return (
    <ThemeToggle
      isDarkTheme={isDarkTheme}
      onToggle={() => setTheme(isDarkTheme ? "light" : "dark")}
    />
  )
}
