import { expect, test } from "@playwright/test"
import type { Page } from "@playwright/test"

const VERCEL_PREVIEW_TOOLBAR_STORAGE_ERROR =
  "TypeError: undefined is not an object (evaluating 'navigator.storage.persisted')"
const VERCEL_PREVIEW_TOOLBAR_URL =
  "https://vercel.live/_next-live/feedback/feedback.html"

const isVercelPreviewToolbarStorageError = (error: Error) =>
  error.message === VERCEL_PREVIEW_TOOLBAR_STORAGE_ERROR &&
  error.stack?.includes(VERCEL_PREVIEW_TOOLBAR_URL) === true

const collectBrowserErrors = (page: Page) => {
  const browserErrors: string[] = []

  page.on("console", (message) => {
    if (message.type() === "error") browserErrors.push(message.text())
  })
  page.on("pageerror", (error) => {
    if (!isVercelPreviewToolbarStorageError(error)) {
      browserErrors.push(error.message)
    }
  })

  return browserErrors
}

const getThemeToggle = (page: Page) => {
  return page.getByTestId("theme-toggle")
}

test("isolates the verified Vercel toolbar storage error", () => {
  const vercelToolbarError = new Error(VERCEL_PREVIEW_TOOLBAR_STORAGE_ERROR)
  vercelToolbarError.stack = `${VERCEL_PREVIEW_TOOLBAR_STORAGE_ERROR}\n    at ${VERCEL_PREVIEW_TOOLBAR_URL}:9:91077`

  const applicationError = new Error(VERCEL_PREVIEW_TOOLBAR_STORAGE_ERROR)
  applicationError.stack = `${VERCEL_PREVIEW_TOOLBAR_STORAGE_ERROR}\n    at http://localhost:3000/app.js:1:1`

  expect(isVercelPreviewToolbarStorageError(vercelToolbarError)).toBe(true)
  expect(isVercelPreviewToolbarStorageError(applicationError)).toBe(false)
  expect(
    isVercelPreviewToolbarStorageError(
      new Error("Unexpected application failure"),
    ),
  ).toBe(false)
})

test("removes spatial feedback when the user prefers reduced motion", async ({
  page,
}) => {
  await page.emulateMedia({ reducedMotion: "reduce" })
  await page.addInitScript(() => {
    window.localStorage.setItem("theme", "light")
  })
  await page.goto("/")

  const themeToggle = getThemeToggle(page)
  const submitButton = page.getByRole("button", { name: "Search" })

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
  const darkThemeToggle = getThemeToggle(page)

  await expect(documentRoot).toHaveClass(/light/)
  await expect(darkThemeToggle).toBeVisible()

  await darkThemeToggle.click()

  await expect(documentRoot).toHaveClass(/dark/)
  await expect(getThemeToggle(page)).toBeVisible()
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
  await expect(getThemeToggle(page)).toBeVisible()
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
  await expect(getThemeToggle(page)).toBeVisible()
  expect(browserErrors).toEqual([])
})

test("keeps the theme control in the expected top-right control area", async ({
  page,
}) => {
  await page.goto("/")

  const themeToggle = getThemeToggle(page)
  const viewport = page.viewportSize()
  const toggleBounds = await themeToggle.boundingBox()

  expect(viewport).not.toBeNull()
  expect(toggleBounds).not.toBeNull()
  expect(toggleBounds!.y).toBeLessThan(72)
  const toggleRightEdge = toggleBounds!.x + toggleBounds!.width
  expect(toggleRightEdge).toBeGreaterThan(viewport!.width - 24)
  expect(toggleRightEdge).toBeLessThanOrEqual(viewport!.width)
  await expect(themeToggle).toBeVisible()
})
