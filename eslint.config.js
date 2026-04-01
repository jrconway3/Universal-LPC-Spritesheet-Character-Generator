/* Run: npm i && npx eslint . (or enable ESLint in your IDE) */
const js = require("@eslint/js");
const babelParser = require("@babel/eslint-parser");
const globals = require("globals");
const eslintPluginPrettierRecommended = require("eslint-plugin-prettier/recommended");

const sharedParserOptions = {
  requireConfigFile: false,
  ecmaVersion: "latest",
};

const commonRules = {
  "no-unused-vars": [
    "error",
    {
      argsIgnorePattern: "^_",
      varsIgnorePattern: "^_",
      caughtErrorsIgnorePattern: "^_",
    },
  ],
  "no-console": [
    "error",
    {
      allow: ["error"],
    },
  ],
};

module.exports = [
  {
    ignores: ["item-metadata.js"],
  },
  js.configs.recommended,
  {
    files: ["**/*.js"],
    languageOptions: {
      parser: babelParser,
      parserOptions: {
        ...sharedParserOptions,
        sourceType: "commonjs",
      },
      globals: {
        ...globals.node,
        ...globals.es2021,
      },
    },
    rules: commonRules,
  },
  {
    files: ["sources/**/*.js"],
    languageOptions: {
      parserOptions: {
        ...sharedParserOptions,
        sourceType: "module",
      },
      globals: {
        ...globals.browser,
        ...globals.es2021,
        m: "readonly",
      },
    },
  },
  {
    files: ["tests/**/*.js"],
    languageOptions: {
      parserOptions: {
        ...sharedParserOptions,
        sourceType: "module",
      },
      globals: {
        ...globals.browser,
        ...globals.es2021,
        ...globals.mocha,
        m: "readonly",
      },
    },
  },
  {
    ...eslintPluginPrettierRecommended,
    files: ["**/*.js"],
  },
];
