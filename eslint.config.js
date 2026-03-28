/* Run: npm i && npx eslint . (or enable ESLint in your IDE) */
const js = require("@eslint/js");
const babelParser = require("@babel/eslint-parser");
const globals = require("globals");

const sharedParserOptions = {
	requireConfigFile: false,
	ecmaVersion: "latest",
};

const commonRules = {
	"no-unused-vars": "warn",
	"no-useless-escape": "off",
	"no-console": "off",
};

module.exports = [
	{
		ignores: ["sources/jszip.min.js", "sources/jhash-2.2.min.js"],
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
		files: ["sources/**/*.js", "item-metadata.js"],
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
];
