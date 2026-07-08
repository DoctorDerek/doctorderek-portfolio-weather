import { screen } from "@testing-library/react"
import { getPage } from "next-page-tester"

it("renders the homepage /", async () => {
  const { render } = await getPage({
    route: "/",
    useApp: false,
  })

  render()
  expect(screen.getByText(/Weather/i)).toBeVisible()
  expect(screen.getByText(/Search/i)).toBeVisible()
  expect(screen.getByRole("button")).toBeVisible()
  expect(screen.getByRole("textbox")).toBeVisible()
})
