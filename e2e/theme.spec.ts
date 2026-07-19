import { expect, test } from "@playwright/test"

test("removes spatial feedback when the user prefers reduced motion", async ({
  page,
}) => {
  await page.emulateMedia({ reducedMotion: "reduce" })
  await page.addInitScript(() => {
    window.localStorage.setItem("theme", "light")
  })
  await page.goto("/")

  const themeToggle = page.getByRole("button", {
    name: "Switch to dark theme",
  })
  const submitButton = page.getByRole("button", { name: "Submit" })

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
  await page.addInitScript(() => {
    window.localStorage.setItem("theme", "light")
  })
  await page.goto("/")

  const documentRoot = page.locator("html")
  const darkThemeToggle = page.getByRole("button", {
    name: "Switch to dark theme",
  })

  await expect(documentRoot).toHaveClass(/light/)
  await expect(darkThemeToggle).toBeVisible()

  await darkThemeToggle.click()

  await expect(documentRoot).toHaveClass(/dark/)
  await expect(
    page.getByRole("button", { name: "Switch to light theme" }),
  ).toBeVisible()
  await expect
    .poll(() => page.evaluate(() => window.localStorage.getItem("theme")))
    .toBe("dark")
})
