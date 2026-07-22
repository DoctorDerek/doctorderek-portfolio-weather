import { expect, test } from "@playwright/test"
import type { Page } from "@playwright/test"

const collectBrowserErrors = (page: Page) => {
  const browserErrors: string[] = []

  page.on("console", (message) => {
    if (message.type() === "error") browserErrors.push(message.text())
  })
  page.on("pageerror", (error) => browserErrors.push(error.message))

  return browserErrors
}

test("removes spatial feedback when the user prefers reduced motion", async ({
  page,
}) => {
  await page.emulateMedia({ reducedMotion: "reduce" })
  await page.addInitScript(() => {
    window.localStorage.setItem("theme", "light")
  })
  await page.goto("/")

  const themeToggle = page.getByRole("button", {
    name: "Switch to dark theme",
  })
  const submitButton = page.getByRole("button", { name: "Submit" })

  await expect(themeToggle.locator(".sun")).toHaveCSS(
    "transition-duration",
    "0s",
  )

  await submitButton.hover()

  await expect(submitButton).toHaveCSS("transform", "none")
})

test("persists dark mode through the accessible theme control", async ({
  page,
}) => {
  const browserErrors = collectBrowserErrors(page)

  await page.addInitScript(() => {
    window.localStorage.setItem("theme", "light")
  })
  await page.goto("/")

  const documentRoot = page.locator("html")
  const darkThemeToggle = page.getByRole("button", {
    name: "Switch to dark theme",
  })

  await expect(documentRoot).toHaveClass(/light/)
  await expect(darkThemeToggle).toBeVisible()

  await darkThemeToggle.click()

  await expect(documentRoot).toHaveClass(/dark/)
  await expect(
    page.getByRole("button", { name: "Switch to light theme" }),
  ).toBeVisible()
  await expect
    .poll(() => page.evaluate(() => window.localStorage.getItem("theme")))
    .toBe("dark")
  expect(browserErrors).toEqual([])
})

test("hydrates a persisted dark theme without browser errors", async ({
  page,
}) => {
  const browserErrors = collectBrowserErrors(page)

  await page.addInitScript(() => {
    window.localStorage.setItem("theme", "dark")
  })
  await page.goto("/")

  await expect(page.locator("html")).toHaveClass(/dark/)
  await expect(
    page.getByRole("button", { name: "Switch to light theme" }),
  ).toBeVisible()
  expect(browserErrors).toEqual([])
})

test("hydrates the system theme without browser errors", async ({ page }) => {
  const browserErrors = collectBrowserErrors(page)

  await page.emulateMedia({ colorScheme: "dark" })
  await page.addInitScript(() => {
    window.localStorage.removeItem("theme")
  })
  await page.goto("/")

  await expect(page.locator("html")).toHaveClass(/dark/)
  await expect(
    page.getByRole("button", { name: "Switch to light theme" }),
  ).toBeVisible()
  expect(browserErrors).toEqual([])
})
