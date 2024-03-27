<script lang="ts" context="module">
	import type { Meta } from "@storybook/svelte";
	import DialogCreateLibrary from "./DialogCreateLibrary.svelte";

	export const meta = {
		title: "organisms/DialogCreateLibrary",
		component: DialogCreateLibrary,
		// tags: ["autodocs"],
		argTypes: {},
	} satisfies Meta<DialogCreateLibrary>;
</script>

<script>
	import { Story, Template } from "@storybook/addon-svelte-csf";
	import { getContext } from "svelte";
	import { writable } from "svelte/store";

	let maybeCreateNewLibrary = writable(true);
	let maybeNewLibraryPath = writable("/example/tmp/path/to/library");
</script>

<Template let:args>
	<button on:click={() => maybeCreateNewLibrary.set(true)}>open dialog</button>
	<DialogCreateLibrary {maybeCreateNewLibrary} {maybeNewLibraryPath} />
</Template>

<Story name="Default" source />
