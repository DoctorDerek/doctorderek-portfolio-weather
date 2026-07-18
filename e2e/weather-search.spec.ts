import { expect, test } from "@playwright/test"

const LIVE_WEATHER_TEST_CITY = "Mexico City"
const INVALID_LIVE_WEATHER_TEST_CITY = "NoSuchCityQream987654321"

test("searches live weather through encoded city navigation", async ({
  page,
}) => {
  await page.goto("/")

  await page
    .getByRole("textbox", { name: "Weather Search:" })
    .fill(LIVE_WEATHER_TEST_CITY)
  await page.getByRole("button", { name: "Submit" }).click()

  await expect(page).toHaveURL(/\?city=Mexico%20City$/)
  await expect(
    page.getByRole("heading", { name: LIVE_WEATHER_TEST_CITY }),
  ).toBeVisible()
  await expect(page.getByText("Temperature:")).toBeVisible()
})

test("announces live API errors without stale weather output", async ({
  page,
}) => {
  await page.goto("/")

  await page
    .getByRole("textbox", { name: "Weather Search:" })
    .fill(INVALID_LIVE_WEATHER_TEST_CITY)
  await page.getByRole("button", { name: "Submit" }).click()

  await expect(page).toHaveURL(/\?city=NoSuchCityQream987654321$/)
  await expect(
    page.getByRole("alert").filter({ hasText: "Error 404: City Not Found" }),
  ).toBeVisible()
  await expect(page.getByText("Temperature:")).toHaveCount(0)
})
