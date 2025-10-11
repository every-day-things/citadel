module.exports = {
	root: true,
	env: { browser: true, es2020: true },
	settings: {
		react: { version: "detect" },
	},
	extends: [
		"eslint:recommended",
		"plugin:@typescript-eslint/recommended-type-checked",
		"plugin:@typescript-eslint/stylistic-type-checked",
		"plugin:react-hooks/recommended",
		"plugin:react/recommended",
		"plugin:react/jsx-runtime",
	],
	ignorePatterns: [
		"dist",
		".eslintrc.cjs",
		"vite.config.ts",
		"src/bindings.ts",
		"src-tauri/",
	],
	parser: "@typescript-eslint/parser",
	plugins: ["react-refresh", "eslint-plugin-paths"],
	rules: {
		"react-refresh/only-export-components": [
			"warn",
			{ allowConstantExport: true },
		],
		"paths/alias": "error",
	},
	parserOptions: {
		ecmaVersion: "latest",
		sourceType: "module",
		project: ["./tsconfig.json", "./tsconfig.node.json"],
		tsconfigRootDir: __dirname,
	},
};
