"use client"

import { useTheme } from "next-themes"
import { useSyncExternalStore } from "react"
import ThemeToggle from "@/src/components/ThemeToggle"

const subscribeToClientReadiness = () => () => {}
const getClientReadinessSnapshot = () => true
const getServerReadinessSnapshot = () => false

export default function ToggleDarkMode() {
  const isClientReady = useSyncExternalStore(
    subscribeToClientReadiness,
    getClientReadinessSnapshot,
    getServerReadinessSnapshot,
  )
  const { resolvedTheme, setTheme } = useTheme()

  if (!isClientReady) return null

  const isDarkTheme = resolvedTheme === "dark"

  return (
    <ThemeToggle
      isDarkTheme={isDarkTheme}
      onToggle={() => {
        setTheme(isDarkTheme ? "light" : "dark")
      }}
    />
  )
}
