
import "isomorphic-unfetch"
import "@testing-library/jest-dom/extend-expect"

import { loadEnvConfig } from "@next/env"
import { rest } from "msw"
import { setupServer } from "msw/node"

const projectDir = process.cwd()
loadEnvConfig(projectDir)



Object.defineProperty(window, "matchMedia", {
  writable: true,
  value: jest.fn().mockImplementation((query) => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: jest.fn(),
    removeListener: jest.fn(),
    addEventListener: jest.fn(),
    removeEventListener: jest.fn(),
    dispatchEvent: jest.fn(),
  })),
})

const currentWeatherConditions = "Overcast clouds"
const currentTemperatureInKelvin = 295.372


export const server = setupServer(
  rest.get("https://api.openweathermap.org/*", (req, res, ctx) => {
    const city = req.url.searchParams.get("q")
    if (city && new RegExp("fake", "i").exec(city)) {

      return res(
        ctx.json({
          cod: 404,
          message: "city not found",
        }),
      )
    }
    if (city && new RegExp("no.*weather.*array", "i").exec(city)) {

      return res(
        ctx.json({
          weather: "No weather array",
        }),
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

          temp: currentTemperatureInKelvin,
        },
        name: city,
        cod: 200,
      }),
    )
  }),
)

jest.mock(
  "next/image",
  () =>
    function Image({ src, alt }: { src: string; alt: string }) {

      return <img src={src} alt={alt} />
    },
)
