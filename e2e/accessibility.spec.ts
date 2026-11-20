import { expect, test, type Locator } from "@playwright/test"

async function expectKeyboardVisibleFocus(control: Locator) {
  await expect(control).toBeFocused()
  const ring = await control.evaluate((element) => {
    const style = getComputedStyle(element)
    return {
      keyboardFocus: element.matches(":focus-visible"),
      width: style.outlineWidth,
      style: style.outlineStyle,
      color: style.outlineColor,
      shadow: style.boxShadow,
    }
  })
  expect(ring).toEqual({
    keyboardFocus: true,
    width: "3px",
    style: "solid",
    color: "rgb(255, 255, 255)",
    shadow: expect.stringContaining("rgb(4, 120, 87) 0px 0px 0px 5px"),
  })
}

for (const theme of ["light", "dark"] as const) {
  test(`keeps the keyboard focus ring visible on every primary control in the ${theme} theme`, async ({
    page,
  }) => {
    await page.addInitScript((theme) => {
      window.localStorage.setItem("theme", theme)
    }, theme)
    await page.goto("/")
    const themeSwitch = page.getByRole("button", {
      name:
        theme === "light" ? "Switch to dark theme" : "Switch to light theme",
    })
    await themeSwitch.waitFor()
    const controls = [
      themeSwitch,
      page.getByRole("textbox", { name: "City or place" }),
      page.getByRole("button", { name: "Search", exact: true }),
      page.getByRole("button", { name: "Use my location", exact: true }),
    ]
    for (const control of controls) {
      await page.keyboard.press("Tab")
      await expectKeyboardVisibleFocus(control)
    }
  })
}
