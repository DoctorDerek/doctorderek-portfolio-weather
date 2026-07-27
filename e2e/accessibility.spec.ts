import { expect, test, type Locator } from "@playwright/test"
import type { Page } from "@playwright/test"

const getThemeToggle = (page: Page) => page.getByTestId("theme-toggle")
const MAX_TAB_PRESSES_TO_REACH_CONTROL = 12

async function tabToControl(page: Page, control: Locator) {
  for (
    let tabPresses = 0;
    tabPresses < MAX_TAB_PRESSES_TO_REACH_CONTROL;
    tabPresses += 1
  ) {
    const isFocused = await control.evaluate(
      (element) => element === document.activeElement,
    )

    if (isFocused) return

    await page.keyboard.press("Tab")
  }

  throw new Error("Keyboard navigation did not reach the expected control")
}

async function expectKeyboardVisibleFocus(control: Locator) {
  await expect(control).toBeFocused()
  await expect(control).toHaveCSS("outline-style", "solid")
  await expect(control).toHaveCSS("outline-width", "3px")
  await expect(control).toHaveCSS("outline-color", "rgb(255, 255, 255)")
  await expect(control).toHaveCSS(
    "box-shadow",
    /rgb\(4, 120, 87\) 0px 0px 0px 5px/,
  )
}

test("keeps every primary weather control visibly keyboard focused", async ({
  page,
}) => {
  await page.addInitScript(() => {
    window.localStorage.setItem("theme", "light")
  })
  await page.goto("/")

  const primaryWeatherControls = [
    getThemeToggle(page),
    page.getByRole("textbox", { name: "City or place" }),
    page.getByRole("button", { name: "Search" }),
    page.getByTestId("weather-location-button"),
  ]

  await expect(primaryWeatherControls[0]).toBeVisible()

  for (const control of primaryWeatherControls) {
    await tabToControl(page, control)
    await expectKeyboardVisibleFocus(control)
  }
})
