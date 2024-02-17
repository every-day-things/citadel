/** @type {import("prettier").Config} */
const config = {
	plugins: ['prettier-plugin-svelte'],
	overrides: [{ files: '*.svelte', options: { parser: 'svelte' } }],
}

export default config
