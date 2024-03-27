<script lang="ts" context="module">
	import type { Meta } from "@storybook/svelte";
	import TextInput from "./TextInput.svelte";

	export const meta = {
		title: "forms/TextInput",
		component: TextInput,
		// tags: ["autodocs"],
		argTypes: {
			label: {
				control: {
					type: "text",
				},
			},
		},
		args: {
			label: "Input title",
		},
	} satisfies Meta<TextInput>;
</script>

<script>
	import { Story, Template } from "@storybook/addon-svelte-csf";
	import { getContext } from "svelte";
	import { writable } from "svelte/store";

	// #region WORKAROUND
	// WORKAROUND: Update state to match the args on mount and when the args change
	// Thanks to https://github.com/storybookjs/addon-svelte-csf/issues/164

	let label = "default";

	// @ts-ignore
	const { argsStore } =
		getContext("storybook-registration-context-component") || {};
	// @ts-ignore
	argsStore?.subscribe((args) => {
		({ label } = args);
	});
	// #endregion

	let count = 0;
	function handleClick() {
		count += 1;
	}
</script>

<Template let:args>
	<TextInput {...args} bind:label on:click on:click={handleClick}>
		You clicked: {count}
	</TextInput>
</Template>

<Story name="Default" source />
