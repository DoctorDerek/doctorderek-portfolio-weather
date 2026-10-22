/**
 * ONE-TIME EXCEPTION TO NO CODE COMMENT RULE:
 * typescript-eslint (v8.63.0) is broken with TypeScript 7 (v7.0.2)
 * until TS 7 releases an API (planned for v7.1.0+)
 * TODO Upgrade to TS 7 when the version is >7.1.0 and typescript-eslint is working with TS7
 * */
import gitignore from "eslint-config-flat-gitignore"
import nextConfig from "eslint-config-next"
import nextTypeScript from "eslint-config-next/typescript"
import eslintConfigPrettier from "eslint-config-prettier/flat"
import { defineConfig } from "eslint/config"
import "eslint-plugin-only-warn"

const eslintConfig = defineConfig([
  gitignore(),
  ...nextConfig,
  {
    files: ["**/*.{ts,tsx,mts,cts}"],
    extends: [nextTypeScript],
  },
  {
    name: "weather/motion-button-test-adapter",
    files: ["src/components/LocationWeatherButton.test.tsx"],
    rules: {
      "@typescript-eslint/no-unused-vars": [
        "warn",
        { args: "all", argsIgnorePattern: "^_while(Hover|Tap)$" },
      ],
    },
  },
  eslintConfigPrettier,
])

export default eslintConfig
