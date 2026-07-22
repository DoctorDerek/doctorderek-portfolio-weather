import { expect, test } from "@playwright/test"

const NARROW_VIEWPORT = { width: 320, height: 568 }
const LIVE_WEATHER_TEST_CITY = "Mexico City"

test("keeps the complete forecast workspace inside a narrow viewport", async ({
  page,
}) => {
  await page.setViewportSize(NARROW_VIEWPORT)
  await page.addInitScript(() => {
    window.localStorage.setItem("theme", "light")
  })
  await page.goto("/?city=Mexico%20City")

  const workspace = page.getByTestId("weather-workspace")
  const themeToggle = page.getByRole("button", {
    name: "Switch to dark theme",
  })

  await expect(workspace).toBeVisible()
  await expect(themeToggle).toBeVisible()
  await expect(
    page.getByRole("heading", { name: LIVE_WEATHER_TEST_CITY }),
  ).toBeVisible()

  const workspaceBounds = await workspace.boundingBox()
  const themeToggleBounds = await themeToggle.boundingBox()

  if (!workspaceBounds || !themeToggleBounds) {
    throw new Error("Responsive weather controls were not measurable")
  }

  const documentWidth = await page.evaluate(() => ({
    clientWidth: document.documentElement.clientWidth,
    scrollWidth: document.documentElement.scrollWidth,
  }))
  const controlsOverlap = !(
    themeToggleBounds.y + themeToggleBounds.height <= workspaceBounds.y ||
    workspaceBounds.y + workspaceBounds.height <= themeToggleBounds.y ||
    themeToggleBounds.x + themeToggleBounds.width <= workspaceBounds.x ||
    workspaceBounds.x + workspaceBounds.width <= themeToggleBounds.x
  )

  expect(workspaceBounds.x).toBeGreaterThanOrEqual(0)
  expect(workspaceBounds.x + workspaceBounds.width).toBeLessThanOrEqual(
    NARROW_VIEWPORT.width,
  )
  expect(documentWidth.scrollWidth).toBeLessThanOrEqual(
    documentWidth.clientWidth,
  )
  expect(controlsOverlap).toBe(false)
})

test("renders the weather workspace as a translucent backdrop surface", async ({
  page,
}) => {
  await page.goto("/")

  const visualContract = await page
    .getByTestId("weather-workspace")
    .evaluate((element) => {
      const computedStyle = getComputedStyle(element)

      return {
        backdropFilter: computedStyle.backdropFilter,
        backgroundColor: computedStyle.backgroundColor,
        borderRadius: computedStyle.borderRadius,
      }
    })

  expect(visualContract.backdropFilter).toContain("blur")
  expect(visualContract.backgroundColor).not.toBe("rgba(0, 0, 0, 0)")
  expect(visualContract.borderRadius).toBe("32px")
})

test("removes spatial workspace and forecast motion when requested", async ({
  page,
}) => {
  await page.emulateMedia({ reducedMotion: "reduce" })
  await page.goto("/?city=Mexico%20City")

  await expect(page.getByTestId("weather-workspace")).toHaveCSS(
    "transform",
    "none",
  )
  await expect(page.getByTestId("forecast-transition")).toHaveCSS(
    "transform",
    "none",
  )
})
