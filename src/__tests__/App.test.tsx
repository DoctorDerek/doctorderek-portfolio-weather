import { server } from "@/src/utils/setup-tests"
import { render, screen, waitFor } from "@testing-library/react"
import userEvent from "@testing-library/user-event"

import App from "@/src/components/App"

const currentWeatherConditions = "Overcast clouds"
// const currentTemperatureInKelvin = 295.372
const currentTemperatureInFahrenheit = 72

beforeAll(() => server.listen())
afterEach(() => server.resetHandlers())
afterAll(() => server.close())

const renderApp = () => render(<App />)

test("it renders the <App>", () => {
  renderApp()
  expect(screen.getByText(/Weather/i)).toBeVisible()
  expect(screen.getByText(/Search/i)).toBeVisible()
  expect(screen.getByText(/Submit/i)).toBeVisible()
  expect(screen.getByRole("button")).toBeVisible()
})

test("it shows nothing when clicking the button for no city", async () => {
  renderApp()
  userEvent.click(screen.getByRole("button"))
  await waitFor(() => expect(screen.queryByText(/overcast/i)).toBeNull())
  expect(screen.queryByText(/clouds/i)).toBeNull()
})

test("it has accessible labels and displays results for 'Memphis'", async () => {
  const city = "Memphis"
  renderApp()
  userEvent.type(screen.getByText(/search/i), city)
  userEvent.click(screen.getByText(/submit/i))
  await waitFor(() => expect(screen.getByText(/loading/i)).toBeVisible())
  await waitFor(() => expect(screen.getByText(/Temp/i)).toBeVisible()) // Temperature
  expect(screen.getByText(new RegExp(city, "i"))).toBeVisible()
  expect(
    screen.getByText(new RegExp(currentWeatherConditions, "i")),
  ).toBeVisible()
  expect(
    screen.getByText(new RegExp(`${currentTemperatureInFahrenheit}.*°`, "i")),
  ).toBeVisible()
})

test("it shows weather results when clicking the button for 'Memphis'", async () => {
  const city = "Memphis"
  renderApp()
  userEvent.type(screen.getByRole("textbox"), city)
  userEvent.click(screen.getByRole("button"))
  await waitFor(() => expect(screen.getByText(/loading/i)).toBeVisible())
  await waitFor(() => expect(screen.getByText(/Temp/i)).toBeVisible()) // Temperature
  expect(screen.getByText(new RegExp(city, "i"))).toBeVisible()
  expect(
    screen.getByText(new RegExp(currentWeatherConditions, "i")),
  ).toBeVisible()
  expect(
    screen.getByText(new RegExp(`${currentTemperatureInFahrenheit}.*°`, "i")),
  ).toBeVisible()
})

test("it shows an error when clicking the button for 'FakeCity'", async () => {
  const city = "FakeCity"
  renderApp()
  userEvent.type(screen.getByRole("textbox"), city)
  userEvent.click(screen.getByRole("button"))
  await waitFor(() => expect(screen.getByText(/loading/i)).toBeVisible())
  await waitFor(() => expect(screen.getByText(/not found/i)).toBeVisible())
  expect(screen.getByText(/error/i)).toBeVisible()
  expect(screen.queryByText(new RegExp(city, "i"))).toBeNull()
  expect(screen.queryByText(/Temp/i)).toBeNull() // Temperature
})
