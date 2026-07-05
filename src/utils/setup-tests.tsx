// Note: this file will run before any test file and will run on all tests.
import "isomorphic-unfetch"
import "@testing-library/jest-dom/extend-expect" // add better assertions

import { loadEnvConfig } from "@next/env"
import { rest } from "msw"
import { setupServer } from "msw/node"

// load environment variables from .env.test file via Next.js
const projectDir = process.cwd()
loadEnvConfig(projectDir)
// Reference: https://nextjs.org/docs/basic-features/environment-variables#test-environment-variables

// fix "Error: Uncaught [TypeError: window.matchMedia is not a function]",
// which is caused by the package next-themes when the server-side tests run
Object.defineProperty(window, "matchMedia", {
  writable: true,
  value: jest.fn().mockImplementation((query) => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: jest.fn(), // Deprecated
    removeListener: jest.fn(), // Deprecated
    addEventListener: jest.fn(),
    removeEventListener: jest.fn(),
    dispatchEvent: jest.fn(),
  })),
})

const currentWeatherConditions = "Overcast clouds"
const currentTemperatureInKelvin = 295.372
// const currentTemperatureInFahrenheit = 72

// `https://api.openweathermap.org/data/2.5/weather?q=${city}&appid=${API_KEY}`
export const server = setupServer(
  rest.get("https://api.openweathermap.org/*", (req, res, ctx) => {
    const city = req.url.searchParams.get("q")
    if (city && new RegExp("fake", "i").exec(city)) {
      // "FakeCity"
      return res(
        ctx.json({
          cod: 404, // "NOT FOUND" https://http.cat/404
          message: "city not found",
        })
      )
    }
    if (city && new RegExp("no.*weather.*array", "i").exec(city)) {
      // "FakeCity"
      return res(
        ctx.json({
          weather: "No weather array",
        })
      )
    }
    return res(
      ctx.json({
        weather: [
          {
            description: currentWeatherConditions,
          },
        ],
        main: {
          // temp in Kelvin
          temp: currentTemperatureInKelvin,
        },
        name: city,
        cod: 200, // "OK" https://http.cat/200
      })
    )
  })
)

jest.mock(
  "next/image",
  () =>
    function Image({ src, alt }: { src: string; alt: string }) {
      // eslint-disable-next-line @next/next/no-img-element
      return <img src={src} alt={alt} />
    }
)
