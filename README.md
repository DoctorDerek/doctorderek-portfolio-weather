# Weather Portfolio

[![Codecov](https://codecov.io/gh/DoctorDerek/doctorderek-portfolio-weather/graph/badge.svg)](https://app.codecov.io/gh/DoctorDerek/doctorderek-portfolio-weather)

A responsive city-weather search built with Next.js 16, React 19, TypeScript 6, and Tailwind CSS 4. OpenWeatherMap requests run exclusively on the server so the API key is never sent to the browser.

[Open the live application](https://portfolio-weather.doctorderek.com/)

## Highlights

- Searches current weather conditions by city through a server-only OpenWeatherMap integration.
- Validates upstream success payloads at runtime before rendering typed application data.
- Presents API failures in accessible, auto-dismissing toast notifications.
- Persists light and dark themes through an animated, keyboard-accessible control.
- Adapts the search and weather presentation across mobile and desktop viewports.

## Architecture

The App Router page reads the city query parameter and performs the weather request through a server-only service. That service returns a discriminated `WeatherResult` rather than exposing the upstream response shape to the UI. Client components own navigation, theme interaction, and transient error feedback.

The primary stack is:

- Next.js 16 App Router and React 19
- TypeScript 6 with strict type checking
- Tailwind CSS 4
- `next-themes` and `react-hot-toast`
- Vitest, Testing Library, Playwright, and Codecov infrastructure
- Node.js 24 and pnpm 11

## Local development

Create `.env.local` from `.env.example`, then provide an OpenWeatherMap API key:

```dotenv
OPEN_WEATHER_MAP_API_KEY=your_key_here
```

Install and run the project with the repository’s declared Node and pnpm versions:

```bash
fnm use
corepack enable pnpm
pnpm install
pnpm dev
```

The development server is available at [http://localhost:3000](http://localhost:3000).

## Quality checks

```bash
pnpm exec tsc --noEmit
pnpm lint
pnpm exec vitest run --coverage --passWithNoTests
pnpm exec playwright test --pass-with-no-tests
pnpm build
pnpm format
```

GitHub Actions runs ESLint and Vitest coverage on pull requests, reports coverage through Codecov, and runs Playwright against successful Vercel Preview deployments. The Vitest integration suite covers the server-only weather service, accessible search navigation, weather presentation states, and API error feedback. Coverage remains a measured progress signal rather than a merge-blocking threshold.

## Provenance and attribution

This project began as a weather-app repair and refactor exercise based on an [assessment scaffold](https://codesandbox.io/s/blazing-butterfly-6qudf) and supplied design brief. The current application has since been substantially rebuilt and modernized.

- The animated theme-toggle illustration is by [@bartkozal](https://codesandbox.io/s/dark-mode-toggle-si6k2?file=/src/DarkModeToggle.js) and is used with permission.
- The background photograph is by [John Fowler on Unsplash](https://unsplash.com/photos/RsRTIofe0HE).
- The favicon uses Twitter Twemoji artwork under CC BY 4.0; full attribution is in [`public/favicon-io/about.txt`](public/favicon-io/about.txt).

## License

Copyright © 2026 Dr. Derek Austin. All rights reserved. Third-party assets retain their respective licenses and permissions. See [`LICENSE.txt`](LICENSE.txt) for the repository terms.
