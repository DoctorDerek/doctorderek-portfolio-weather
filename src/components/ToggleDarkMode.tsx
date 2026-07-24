"use client"

import { useTheme } from "next-themes"
import ThemeToggle from "@/src/components/ThemeToggle"

export default function ToggleDarkMode() {
  const { resolvedTheme, setTheme } = useTheme()
  const isDarkTheme = resolvedTheme === "dark"
  const isThemeSettled = resolvedTheme === "light" || isDarkTheme

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
