/**
 * ONE-TIME EXCEPTION TO NO CODE COMMENT RULE:
 * typescript-eslint currently supports TypeScript versions below 6.1.
 * TODO Upgrade to TypeScript 7 after typescript-eslint officially supports it.
 */
import type { ESLint, Linter } from "eslint"
import gitignore from "eslint-config-flat-gitignore"
import nextConfig from "eslint-config-next"
import eslintConfigPrettier from "eslint-config-prettier/flat"
import onlyWarn from "eslint-plugin-only-warn"

const eslintConfig: Linter.Config[] = [
  gitignore(),
  ...nextConfig,
  eslintConfigPrettier,
  {
    plugins: {
      "only-warn": onlyWarn as unknown as ESLint.Plugin,
    },
  },
]

export default eslintConfig
