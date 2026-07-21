"use client"

import { useTheme } from "next-themes"
import { useEffect, useState } from "react"
import ThemeToggleArtwork from "@/src/components/ThemeToggleArtwork"

const classNames = (...args: string[]) => args.filter(Boolean).join(" ")

export default function ToggleDarkMode() {
  const [mounted, setMounted] = useState(false)
  const { resolvedTheme, setTheme } = useTheme()

  useEffect(() => {
    const timer = setTimeout(() => {
      setMounted(true)
    }, 0)
    return () => clearTimeout(timer)
  }, [])

  if (!mounted) return null

  const isDarkTheme = resolvedTheme === "dark"

  return (
    <button
      type="button"
      aria-label={
        isDarkTheme ? "Switch to light theme" : "Switch to dark theme"
      }
      className={classNames(
        "absolute top-4 right-4 z-20 inline-flex bg-transparent text-gray-900",
        "cursor-pointer rounded-[35px] border-0 p-0 focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2",
        isDarkTheme ? "theme-toggle--dark" : "theme-toggle--light",
      )}
      onClick={() => {
        setTheme(isDarkTheme ? "light" : "dark")
      }}
    >
      <ThemeToggleArtwork />
    </button>
  )
}
