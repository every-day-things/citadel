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
	overrides: [
		{
			files: ["src/**/*.{ts,tsx}"],
			excludedFiles: ["src/lib/theme.ts", "src/routeTree.gen.ts", "src/bindings.ts"],
			rules: {
				"no-restricted-syntax": [
					"error",
					{
						selector:
							"Literal[value=/^(?:#(?:[0-9a-fA-F]{3,8})|rgba?\\(|hsla?\\()/]",
						message:
							"Use design tokens (`var(--ctd-...)`) instead of hardcoded color literals.",
					},
					{
						selector: "Literal[value='white'], Literal[value='black']",
						message:
							"Use design tokens (`var(--ctd-...)`) instead of named color literals.",
					},
					{
						selector:
							"TemplateElement[value.raw=/^(?:#(?:[0-9a-fA-F]{3,8})|rgba?\\(|hsla?\\()/]",
						message:
							"Use design tokens (`var(--ctd-...)`) instead of hardcoded color literals.",
					},
				],
			},
		},
	],
	parserOptions: {
		ecmaVersion: "latest",
		sourceType: "module",
		project: ["./tsconfig.json", "./tsconfig.node.json"],
		tsconfigRootDir: __dirname,
	},
};
