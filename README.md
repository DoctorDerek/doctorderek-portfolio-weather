[![Vercel](https://therealsujitk-vercel-badge.vercel.app/?app=weather-app-demo-doctorderek)](https://weather-app-demo-doctorderek.vercel.app/) [![Codecov](https://codecov.io/gh/DoctorDerek/doctorderek-portfolio-weather/graph/badge.svg)](https://app.codecov.io/gh/DoctorDerek/doctorderek-portfolio-weather) [![Build Status](https://app.travis-ci.com/DoctorDerek/weather-app-demo.svg?branch=main)](https://app.travis-ci.com/DoctorDerek/weather-app-demo)

# 🏖️ Weather App Demo - Next.js 11 + React 17 + Tailwind CSS + 100% Test Coverage

# ✅ Code Repaired to Work and Match Design by Dr. Derek Austin

# 👀 View Production Build at https://weather-app-demo-doctorderek.vercel.app

I repaired [this weather app](https://codesandbox.io/s/blazing-butterfly-6qudf) to actually work and match the design document.

Additionally, I added 7 other major features, including best practices and extensive test coverage (100% of lines).

Below you will find a complete feature set, discussion section, and technical journal.

## Local Development

Use [fnm](https://github.com/Schniz/fnm) for Node version management and [pnpm](https://pnpm.io/) as the package manager:

```bash
fnm use
corepack enable pnpm
pnpm install
pnpm dev
```

## Required Features

1. ✅ Fix the bug where the app crashes when trying to request the weather

2. ✅ Refactor <CityWeather> to a function component using React Hooks

3. ✅ Match the supplied design brief

4. ✅ Improve web accessibility

   - Ensure that clicking on the label "Weather Search" puts focus into the text-input.
     - _solution:_ `<label htmlFor="city">Weather Search <input type="text" id="city" /></label>`
   - Make sure any loading states are correctly announced to a screen reader
     - _solution:_ `const Loading = () => (<div aria-live="polite">loading...</div>)`

5. ✅ Make the tests better

## Additional Features

1. ✅ Deployed production build of Next.js to Vercel with CI/CD
2. ✅ Upgraded Next.js to `@latest` (`v11.1.2`) and all other dependencies
3. ✅ Established engineering best practices:
   - Prettier, ESLint, Husky (Git Hooks), `tsconfig.json`, TypeScript Import Sorter, `.gitattributes`
4. ✅ Crafted unit tests for new code features (TDD / Test Driven Development)
   - Jest + React Testing Library with React Test Renderer
5. ✅ Wrote unit testing for existing code (16% ➡ 100% test coverage)
6. ✅ Developed mobile-first, responsive UX design with Tailwind CSS
7. ✅ Implemented Tailwind CSS dark mode for app with animated SVG toggle

## Discussion Section

1. ✅ Talk about your changes when fixing the "App crashes on submit" bug

   - The bug was caused by the classic JavaScript problem where trying to access properties of `null` or `undefined` throws an error.

   - Avoiding that type of error, especially in production, is one of the main advantages of using TypeScript for static code analysis.

   - In this case, the `weatherResult` was not properly typed, and there was no error handling for `404` errors (`"city not found"`).

   - I prefer building robust components with a variety of guard clauses, so I made the city prop optional in `<CityWeather>`.

   - I also identified errors with ESLint, such as `formdata.get("city").toString()` being unsafe vs. `String(formData.get("city"))`.

2. ✅ Talk about your changes when refactoring the `<CityWeather>` component

   - Acting like this was a "real" work environment with an "urgent" bugfix, I fixed the bug before refactoring to a function component.

   - However, given that this was really a new feature, I would have preferred to refactor and make the code clearer before implementation.

   - I also refactored the structure of the app significantly, including absolute paths (`@/src/**`), `eslint-plugin-tailwindcss`, and more.

   - Even though I moved the API_KEY to `.env.local`, it is still exposed in `.env.test` and in query parameters via the use of a GET request.

   - Ideally, the API_KEY secret would be protected by using a dummy variable in `.env.test` and using POST instead of GET to hit the API.

## Test Coverage Report - Jest & React Testing Library

### `npm run test`

Launches the test runner and generates code coverage report.

### `npm test:watch`

Launches the test runner in the interactive watch mode.

## Technical Journal

- `1.0.0` Existing codebase: Next.js 10 (TypeScript)
- `1.0.1` First commit by Dr. Derek Austin: `chore: delete yarn.lock`
- `1.1.0` Upgraded all dependencies and established best practices like Husky
- `1.2.0` Bugfix / Developed first working development build in Next.js
- `1.3.0` Refactored `<CityWeather>` to function component with `useEffect`
- `1.4.0` Fixed tests, added loading message, and deployed to Vercel with CI/CD
- `1.4.1` Reached 100% test coverage by adding `next-page-tester` to test `/`
- `1.5.0` Implemented design document and developed UX for mobile experience
- `1.6.0` Improved web accessibility using <label> and aria-live="polite"
- `1.7.0` Created dark mode for app using Tailwind CSS plus animated SVG toggle
- `2.0.0` Reached 100% test coverage of lines by testing <ToggleDarkMode>
- `2.0.1` Hotfix to remove vertical scroll bars on mobile caused by `h-screen`
