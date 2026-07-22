import { expect, test, type Locator } from "@playwright/test"

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
    page.getByRole("button", { name: "Switch to dark theme" }),
    page.getByRole("textbox", { name: "Weather Search:" }),
    page.getByRole("button", { name: "Submit" }),
    page.getByRole("button", { name: "Use my location" }),
  ]

  await expect(primaryWeatherControls[0]).toBeVisible()

  for (const control of primaryWeatherControls) {
    await page.keyboard.press("Tab")
    await expectKeyboardVisibleFocus(control)
  }
})
