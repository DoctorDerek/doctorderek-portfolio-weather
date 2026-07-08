/* eslint-disable @typescript-eslint/no-require-imports */
// Modified from kcd-scripts:
// https://github.com/kentcdodds/kcd-scripts/blob/main/src/config/jest.config.js
const fs = require("fs")
const path = require("path")
const readPkgUp = require("read-pkg-up")

const { path: pkgPath } = readPkgUp.sync({
  cwd: fs.realpathSync(process.cwd()),
})
const appDirectory = path.dirname(pkgPath)

const fromRoot = (...p) => path.join(appDirectory, ...p)
const hasFile = (...p) => fs.existsSync(fromRoot(...p))

const ignores = [
  "/node_modules/",
  "/__fixtures__/",
  "/fixtures/",
  "/__tests__/helpers/",
  "/__tests__/utils/",
  "__mocks__",
]

const jestConfig = {
  roots: [fromRoot("src")],
  moduleNameMapper: {
    // equivalent to "paths" in tsconfig.json
    "@/src/(.*)": fromRoot("src") + "/$1",
    "\\.(jpg|ico|jpeg|png|gif|eot|otf|webp|svg|ttf|woff|woff2|mp4|webm|wav|mp3|m4a|aac|oga)$":
      fromRoot("src/__mocks__/file-mock.ts"),
    "\\.(css|less)$": fromRoot("src/__mocks__/file-mock.ts"),
  },
  testEnvironment: "jsdom",
  testURL: "http://localhost",
  moduleFileExtensions: ["js", "jsx", "json", "ts", "tsx"],
  moduleDirectories: [
    "node_modules",
    fromRoot("src"),
    "shared",
    fromRoot("tests"),
  ],
  collectCoverageFrom: ["src/**/*.+(js|jsx|ts|tsx)"],
  testMatch: ["**/__tests__/**/*.+(js|jsx|ts|tsx)"],
  testPathIgnorePatterns: [...ignores],

  // coveragePathIgnorePatterns: [...ignores, "src/(umd|cjs|esm)-entry.js$"],
  coveragePathIgnorePatterns: [...ignores, "src/(umd|cjs|esm)-entry.js$", "_"],
  // ignore "/src/pages/_*" because next-page-tester has a bug with Next v11

  transformIgnorePatterns: ["[/\\\\]node_modules[/\\\\].+\\.(js|jsx)$"],

  coverageThreshold: {
    global: {
      statements: 75,
      branches: 60,
      lines: 75,
      functions: 60,
    },
  },
  watchPlugins: [
    require.resolve("jest-watch-typeahead/filename"),
    require.resolve("jest-watch-typeahead/testname"),
  ],
  snapshotSerializers: [
    require.resolve("jest-serializer-path"),
    require.resolve("jest-snapshot-serializer-raw/always"),
  ],
}

const setupFiles = [
  "src/utils/setup-tests.js",
  "src/utils/setup-tests.ts",
  "src/utils/setup-tests.tsx",
]
for (const setupFile of setupFiles) {
  if (hasFile(setupFile)) {
    jestConfig.setupFilesAfterEnv = [fromRoot(setupFile)]
  }
}

module.exports = jestConfig
