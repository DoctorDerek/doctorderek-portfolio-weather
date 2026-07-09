import gitignore from "eslint-config-flat-gitignore"
import nextVitals from "eslint-config-next/core-web-vitals"
import nextTs from "eslint-config-next/typescript"
import prettier from "eslint-config-prettier"
import "eslint-plugin-only-warn"

export default [
  gitignore(),
  ...nextVitals,
  /**
   * ONE-TIME EXCEPTION TO NO CODE COMMENT RULE:
   * typescript-eslint (v8.63.0) is broken with TypeScript 7 (v7.0.2)
   * until TS 7 releases an API (planned for v7.1.0+)
   * TODO Upgrade to TS 7 when the version is >7.1.0 and typescript-eslint is working with TS7
   * */
  ...nextTs,
  prettier,
]
