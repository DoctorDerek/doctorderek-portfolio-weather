"use client"

import { useTheme } from "next-themes"
import { useEffect, useState } from "react"
import ThemeToggle from "@/src/components/ThemeToggle"

export default function ToggleDarkMode() {
  const [mounted, setMounted] = useState(false)
  const { resolvedTheme, setTheme } = useTheme()

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- Theme state is client-only during hydration.
    setMounted(true)
  }, [])

  if (!mounted) return null

  const isDarkTheme = resolvedTheme === "dark"

  return (
    <ThemeToggle
      isDarkTheme={isDarkTheme}
      onToggle={() => setTheme(isDarkTheme ? "light" : "dark")}
    />
  )
}
