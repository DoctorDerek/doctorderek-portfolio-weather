import nextVitals from "eslint-config-next/core-web-vitals"
// import nextTs from "eslint-config-next/typescript"
import prettier from "eslint-config-prettier/flat"
import { defineConfig, globalIgnores } from "eslint/config"
import "eslint-plugin-only-warn"

const eslintConfig = defineConfig([
  ...nextVitals,
  /**
   * ONE-TIME EXCEPTION TO NO CODE COMMENT RULE:
   * typescript-eslint (v8.63.0) is broken with TypeScript 7 (v7.0.2)
   * until TS 7 releases an API (planned for v7.1.0+)
   * TODO Upgrade to TS 7 when the version is >7.1.0 and typescript-eslint is working with TS7
   * */
  // ...nextTs,
  prettier,
  // Override default ignores of eslint-config-next.
  globalIgnores([".next/**", "out/**", "build/**", "next-env.d.ts"]),
])

export default eslintConfig
