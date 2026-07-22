import { expect, test, type Locator } from "@playwright/test"

const LIVE_WEATHER_TEST_CITY = "Mexico City"
const INVALID_LIVE_WEATHER_TEST_CITY = "NoSuchCityQream987654321"
const LIVE_WEATHER_TEST_COORDINATES = {
  latitude: 19.432_608,
  longitude: -99.133_209,
}

async function waitForMotionButtonHydration(button: Locator) {
  await expect(button).toHaveCSS("transform", "none")
  await button.hover()
  await expect
    .poll(() =>
      button.evaluate((element) => getComputedStyle(element).transform),
    )
    .not.toBe("none")
}

test.beforeEach(async ({ page }) => {
  await page.emulateMedia({ reducedMotion: "no-preference" })
})

test("provides restrained pointer feedback without changing submission semantics", async ({
  page,
}) => {
  await page.goto("/")

  const submitButton = page.getByRole("button", { name: "Search" })

  await expect(submitButton).toHaveAttribute("type", "submit")
  await waitForMotionButtonHydration(submitButton)
})

test("searches live weather through encoded city navigation", async ({
  page,
}) => {
  await page.goto("/")

  await page
    .getByRole("textbox", { name: "City or place" })
    .fill(LIVE_WEATHER_TEST_CITY)
  const submitButton = page.getByRole("button", { name: "Search" })
  await waitForMotionButtonHydration(submitButton)
  await submitButton.click()

  await expect(page).toHaveURL(/\?city=Mexico%20City$/)
  await expect(
    page.getByRole("heading", { name: LIVE_WEATHER_TEST_CITY }),
  ).toBeVisible()
  await expect(page.getByText("Temperature:")).toBeVisible()
})

test("loads live weather after explicit browser location consent", async ({
  context,
  page,
}) => {
  await context.grantPermissions(["geolocation"])
  await context.setGeolocation(LIVE_WEATHER_TEST_COORDINATES)
  await page.goto("/")

  await expect(
    page.getByText("Your location is used once and isn’t stored."),
  ).toBeVisible()
  const locationButton = page.getByRole("button", {
    name: "Use my location",
  })
  await waitForMotionButtonHydration(locationButton)
  await locationButton.click()

  await expect(page.getByText("Temperature:")).toBeVisible()
  await expect(locationButton).toBeEnabled()
  expect(new URL(page.url()).search).toBe("")
})

test("announces live API errors without stale weather output", async ({
  page,
}) => {
  await page.goto("/")

  await page
    .getByRole("textbox", { name: "City or place" })
    .fill(INVALID_LIVE_WEATHER_TEST_CITY)
  const submitButton = page.getByRole("button", { name: "Search" })
  await waitForMotionButtonHydration(submitButton)
  await submitButton.click()

  await expect(page).toHaveURL(/\?city=NoSuchCityQream987654321$/)
  await expect(
    page.getByRole("alert").filter({ hasText: "Error 404: City Not Found" }),
  ).toBeVisible()
  await expect(page.getByText("Temperature:")).toHaveCount(0)
})
