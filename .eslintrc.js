module.exports = {
  root: true,
  parserOptions: {
    ecmaVersion: 2020,
    sourceType: "module",
    ecmaFeatures: {
      jsx: true,
    },
  },
  settings: {
    react: {
      version: "detect",
    },
  },
  env: {
    browser: true,
    amd: true,
    node: true,
    es6: true,
  },
  extends: [
    "eslint:recommended",
    "plugin:react/recommended",
    "plugin:jsx-a11y/recommended",
    "plugin:prettier/recommended",
    "react-app",
    "react-app/jest",
    "next",
  ],
  plugins: ["only-warn"],
  rules: {
    "prettier/prettier": "warn",
    "react/react-in-jsx-scope": "off",
    "react/prop-types": 0,
    "react/no-unescaped-entities": 0,
  },
}
