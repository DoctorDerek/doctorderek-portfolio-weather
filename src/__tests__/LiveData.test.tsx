import "isomorphic-unfetch" // helper to allow direct testing of fetch requests

import { loadEnvConfig } from "@next/env"
import { render, screen, waitFor } from "@testing-library/react"

import CityWeather from "@/src/components/CityWeather"

beforeAll(() => loadEnvConfig(process.cwd()))
// load .env.test to get API_KEY for live data tests

function renderCityWeatherLiveData(city?: string) {
  if (city) return render(<CityWeather city={city} />)
  render(<CityWeather />)
}

test("<CityWeather> renders nothing with default props with live data", () => {
  renderCityWeatherLiveData()
  expect(screen.queryByText(/Temp/i)).toBeNull() // Temperature
})

test("<CityWeather> renders correctly with prop city='Memphis' with live data", async () => {
  const city = "Memphis"
  renderCityWeatherLiveData(city)
  await waitFor(() => expect(screen.getByText(/loading/i)).toBeVisible())
  await waitFor(() => expect(screen.getByText(/Temp/i)).toBeVisible()) // Temperature
  expect(screen.getByText(new RegExp(city, "i"))).toBeVisible()
  expect(screen.getByText(new RegExp("°", "i"))).toBeVisible()
})

test("<CityWeather> renders 'not found' with prop city='FakeCity' with live data", async () => {
  const city = "FakeCity"
  renderCityWeatherLiveData(city)
  await waitFor(() => expect(screen.getByText(/loading/i)).toBeVisible())
  await waitFor(() => expect(screen.getByText(/not found/i)).toBeVisible())
  expect(screen.getByText(/error/i)).toBeVisible()
  expect(screen.queryByText(new RegExp(city, "i"))).toBeNull()
  expect(screen.queryByText(/Temp/i)).toBeNull() // Temperature
})
