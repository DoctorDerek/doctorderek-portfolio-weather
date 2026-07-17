import { setupServer } from "msw/node"
import { openWeatherMapRequestHandlers } from "@/src/test/openWeatherMapHandlers"

const mswServer = setupServer(...openWeatherMapRequestHandlers)

export default mswServer
