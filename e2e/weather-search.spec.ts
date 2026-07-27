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
  await page.goto("/")
  await waitForSearchSubmitReadiness(page)

  await page.getByTestId("weather-input").fill(INVALID_LIVE_WEATHER_TEST_CITY)
  const submitButton = page.getByTestId("weather-search-submit")
  await waitForInteractiveButton(submitButton)
  await Promise.all([
    waitForCityForecastNavigation(page, INVALID_LIVE_WEATHER_TEST_CITY),
    submitButton.click(),
  ])
  await expect(
    page.getByRole("alert").filter({ hasText: "Error 404: City Not Found" }),
  ).toBeVisible()
  await expect(page.getByLabel("Temperature", { exact: true })).toHaveCount(0)
})
