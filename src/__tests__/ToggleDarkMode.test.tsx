import { render, screen, waitFor } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import ToggleDarkMode from "@/src/components/ToggleDarkMode"

function renderToggleDarkMode() {
  render(<ToggleDarkMode />)
}

test("<ToggleDarkMode> renders successfully", () => {
  renderToggleDarkMode()
  expect(screen.queryByLabelText(/toggle.*dark/i)).toBeVisible()
})

test("<ToggleDarkMode> toggles when clicked on", async () => {
  renderToggleDarkMode()
  userEvent.click(screen.getByLabelText(/toggle.*dark/i))
  await waitFor(() => expect(screen.getByLabelText(/enabled/i)).toBeVisible())
})
