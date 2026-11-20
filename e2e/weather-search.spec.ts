import { expect, test, type Locator, type Page } from "@playwright/test"

const LIVE_WEATHER_TEST_CITY = "San Francisco"
const LIVE_WEATHER_TEST_STATE = "California"
const LIVE_WEATHER_TEST_COUNTRY = "United States"
const INVALID_LIVE_WEATHER_TEST_CITY = "NoSuchCityQream987654321"
const LIVE_WEATHER_TEST_COORDINATES = {
  latitude: 37.774_9,
  longitude: -122.419_4,
}

async function waitForSearchSubmitReadiness(page: Page) {
  const searchForm = page.getByTestId("weather-search-form")
  const submitButton = page.getByTestId("weather-search-submit")

  await expect(searchForm).toBeVisible()
  await expect(submitButton).toBeVisible()
  await expect(submitButton).toBeEnabled()
  await expect(submitButton).toHaveAttribute("type", "submit")
}

async function waitForCityForecastNavigation(page: Page, city: string) {
  await page.waitForURL(`**/?city=${encodeURIComponent(city)}`)
}

async function waitForInteractiveButton(button: Locator) {
  await expect(button).toBeVisible()
  await expect(button).toBeEnabled()
}

async function expectPointerMotion(button: Locator) {
  await waitForInteractiveButton(button)
  const baselineTransform = await button.evaluate((element) => {
    return getComputedStyle(element).transform
  })
  await button.hover()
  await expect
    .poll(() =>
      button.evaluate((element) => getComputedStyle(element).transform),
    )
    .not.toBe(baselineTransform)
}

test.beforeEach(async ({ page }) => {
  await page.emulateMedia({ reducedMotion: "no-preference" })
})

for (const width of [320, 390]) {
  test(`contains the search controls and error with enlarged text at ${width}px`, async ({
    page,
  }) => {
    await page.setViewportSize({ width, height: 844 })
    await page.goto(`/?city=${INVALID_LIVE_WEATHER_TEST_CITY}`)
    await expect(page.getByTestId("theme-toggle")).toBeVisible()
    await page.evaluate(() => {
      document.documentElement.style.fontSize = "200%"
    })
    const workspace = page.getByTestId("weather-workspace")
    const bounds = await workspace.boundingBox()
    expect(bounds).not.toBeNull()
    for (const containedElement of [
      page.getByTestId("weather-input"),
      page.getByTestId("weather-search-submit"),
      workspace.getByRole("alert"),
    ]) {
      const elementBounds = await containedElement.boundingBox()
      expect(elementBounds).not.toBeNull()
      expect(elementBounds!.x).toBeGreaterThanOrEqual(bounds!.x)
      expect(elementBounds!.x + elementBounds!.width).toBeLessThanOrEqual(
        bounds!.x + bounds!.width,
      )
    }
    const root = await page.evaluate(() => ({
      width: document.documentElement.clientWidth,
      scroll: document.documentElement.scrollWidth,
    }))
    expect(root.scroll).toBeLessThanOrEqual(root.width)
  })
}

test("provides restrained pointer feedback without changing submission semantics", async ({
  page,
}) => {
  await page.goto("/")
  await waitForSearchSubmitReadiness(page)
  await expect(
    page.getByRole("heading", { name: "Weather, right now" }),
  ).toBeVisible()

  const submitButton = page.getByTestId("weather-search-submit")

  await expect(submitButton).toHaveAttribute("type", "submit")
  await expectPointerMotion(submitButton)
})

test("searches live weather through encoded city navigation", async ({
  page,
}) => {
  await page.goto("/")
  await waitForSearchSubmitReadiness(page)

  await page.getByTestId("weather-input").fill(LIVE_WEATHER_TEST_CITY)
  const submitButton = page.getByTestId("weather-search-submit")
  await waitForInteractiveButton(submitButton)
  await Promise.all([
    waitForCityForecastNavigation(page, LIVE_WEATHER_TEST_CITY),
    submitButton.click(),
  ])
  await expect(
    page.getByRole("heading", { name: LIVE_WEATHER_TEST_CITY }),
  ).toBeVisible()
  const locationDetails = page.getByLabel("Location details", { exact: true })

  await expect(
    locationDetails.getByText(LIVE_WEATHER_TEST_STATE, { exact: true }),
  ).toBeVisible()
  await expect(
    locationDetails.getByText(LIVE_WEATHER_TEST_COUNTRY, { exact: true }),
  ).toBeVisible()
  await expect(page.getByLabel("Temperature", { exact: true })).toBeVisible()
})

test("loads live weather after explicit browser location consent", async ({
  context,
  page,
}) => {
  await context.grantPermissions(["geolocation"])
  await context.setGeolocation(LIVE_WEATHER_TEST_COORDINATES)
  await page.goto("/")
  await waitForSearchSubmitReadiness(page)

  await expect(
    page.getByText("Your location is used once and isn’t stored."),
  ).toBeVisible()
  const locationButton = page.getByTestId("weather-location-button")
  await waitForInteractiveButton(locationButton)
  await locationButton.click()

  await expect(page.getByLabel("Temperature", { exact: true })).toBeVisible()
  await expect(
    page
      .getByLabel("Location details", { exact: true })
      .getByText(LIVE_WEATHER_TEST_COUNTRY, { exact: true }),
  ).toBeVisible()
  await expect(locationButton).toBeEnabled()
  expect(new URL(page.url()).search).toBe("")
})

test("auto-loads local weather when location permission is already granted", async ({
  context,
  page,
}) => {
  await context.grantPermissions(["geolocation"])
  await context.setGeolocation(LIVE_WEATHER_TEST_COORDINATES)
  await page.goto("/")
  await waitForSearchSubmitReadiness(page)

  const locationButton = page.getByTestId("weather-location-button")

  await expect(
    page.getByText("Your location is used once and isn’t stored."),
  ).toBeVisible()
  await expect(page.getByLabel("Temperature", { exact: true })).toBeVisible({
    timeout: 18_000,
  })
  await expect(
    page
      .getByLabel("Location details", { exact: true })
      .getByText(LIVE_WEATHER_TEST_COUNTRY, { exact: true }),
  ).toBeVisible()
  await expect(locationButton).toBeEnabled()
  await expect(locationButton).toHaveAttribute("aria-busy", "false")
  expect(new URL(page.url()).search).toBe("")
})

test("announces live API errors without stale weather output", async ({
  page,
}) => {
  await page.setViewportSize({ width: 390, height: 844 })
  await page.emulateMedia({ reducedMotion: "reduce" })
  await page.clock.install()
  await page.goto("/")
  await waitForSearchSubmitReadiness(page)

  await page.getByTestId("weather-input").fill(INVALID_LIVE_WEATHER_TEST_CITY)
  const submitButton = page.getByTestId("weather-search-submit")
  await waitForInteractiveButton(submitButton)
  await Promise.all([
    waitForCityForecastNavigation(page, INVALID_LIVE_WEATHER_TEST_CITY),
    submitButton.click(),
  ])
  const persistentError = page
    .getByTestId("weather-workspace")
    .getByRole("alert")
  const errorToast = page
    .getByRole("status")
    .filter({ hasText: "Error 404: City Not Found" })
  await expect(persistentError).toHaveText("Error 404: City Not Found")
  await expect(errorToast).toBeVisible()
  await expect(errorToast).toHaveAttribute("aria-live", "off")
  const errorToastBar = errorToast.locator("..")
  const noticeNode = await errorToast.elementHandle()
  await expect(errorToastBar).toHaveCSS("width", "358px")
  await expect(errorToastBar).toHaveCSS("pointer-events", "none")
  const searchViewport = page.locator("[data-search-viewport]")
  const tray = page.locator("[data-weather-notices]")
  await expect(tray).toHaveCSS("position", "relative")
  for (const { width, height, fontSize } of [
    { width: 390, height: 844, fontSize: "100%" },
    { width: 320, height: 568, fontSize: "200%" },
  ]) {
    await page.setViewportSize({ width, height })
    await page.evaluate((size) => {
      document.documentElement.style.fontSize = size
    }, fontSize)
    await expect
      .poll(async () => {
        const [search, notice] = await Promise.all([
          searchViewport.boundingBox(),
          tray.boundingBox(),
        ])
        return (
          !!search &&
          !!notice &&
          search.y + search.height <= notice.y + 1 &&
          Math.abs(notice.y + notice.height - height) <= 1
        )
      })
      .toBe(true)
    await submitButton.scrollIntoViewIfNeeded()
    await expect(submitButton).toBeInViewport({ ratio: 1 })
    await expect(submitButton).toBeEnabled()
    await submitButton.click({ trial: true })
  }
  await page.evaluate(() => {
    document.documentElement.style.fontSize = ""
  })

  await page.setViewportSize({ width: 1440, height: 900 })
  await expect(errorToastBar).toHaveCSS("width", "576px")
  await expect(tray).toHaveCSS("position", "fixed")
  await expect(tray).toHaveCSS("top", "16px")
  expect(
    await errorToast.evaluate(
      (node, original) => node === original,
      noticeNode,
    ),
  ).toBe(true)
  const desktopBar = await errorToastBar.boundingBox()
  expect(desktopBar?.x).toBe((1440 - 576) / 2)
  await expect(page.getByLabel("Temperature", { exact: true })).toHaveCount(0)
  await page.clock.runFor(6000)
  await expect(errorToast).toHaveCount(0)
  await expect(persistentError).toBeVisible()
  const retryResponse = page.waitForResponse(
    (response) =>
      new URL(response.url()).searchParams.get("city") ===
        INVALID_LIVE_WEATHER_TEST_CITY &&
      response.request().resourceType() === "fetch",
  )
  await submitButton.click()
  expect((await retryResponse).ok()).toBe(true)
  await expect(persistentError).toBeVisible()
  await expect(errorToast).toBeVisible()
})
