import gitignore from "eslint-config-flat-gitignore"
import nextVitals from "eslint-config-next/core-web-vitals"
// import nextTs from "eslint-config-next/typescript"
import prettier from "eslint-config-prettier/flat"
import { defineConfig } from "eslint/config"
import "eslint-plugin-only-warn"

const eslintConfig = defineConfig([
  gitignore(),
  ...nextVitals,
  /**
   * ONE-TIME EXCEPTION TO NO CODE COMMENT RULE:
   * typescript-eslint (v8.63.0) is broken with TypeScript 7 (v7.0.2)
   * TODO Restore typescript-eslint rules as soon as possible!!
   * */
  // ...nextTs,
  prettier,
])

export default eslintConfig
