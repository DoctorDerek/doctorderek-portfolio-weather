import { expect, test } from "@playwright/test"

const LIVE_WEATHER_TEST_CITY = "Mexico City"

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
