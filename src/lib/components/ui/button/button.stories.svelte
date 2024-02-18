<script lang="ts" context="module">
	import type { Meta } from "@storybook/svelte";
	import Button from "./button.svelte";

	export const meta = {
		title: "ui/Button",
		component: Button,
		tags: ["autodocs"],
		argTypes: {
			variant: {
				control: {
					type: "select",
				},
				options: ["default", "secondary", "destructive", "ghost"],
			},
			size: {
				control: {
					type: "select",
				},
				options: ["sm", "default", "lg", "icon"],
			},
		},
		args: {
			variant: "default",
			size: "default",
		},
	} satisfies Meta<Button>;
</script>

<script>
	import { Story, Template } from "@storybook/addon-svelte-csf";
	import { getContext } from "svelte";

	// #region WORKAROUND
	// WORKAROUND: Update state to match the args on mount and when the args change
	// Thanks to https://github.com/storybookjs/addon-svelte-csf/issues/164

	let variant = "default";
	let size = "default";

	// @ts-ignore
	const { argsStore } =
		getContext("storybook-registration-context-component") || {};
	// @ts-ignore
	argsStore?.subscribe((args) => {
		console.log(args);
		({ variant, size } = args);
	});
	// #endregion

	let count = 0;
	function handleClick() {
		count += 1;
	}
</script>

<Template let:args>
	<Button {...args} bind:variant bind:size on:click on:click={handleClick}>
		You clicked: {count}
	</Button>
</Template>

<Story name="Default" source />
<Story name="Destructive" args={{ variant: "destructive" }} />
<Story name="Secondary" args={{ variant: "secondary" }} />
<Story name="Ghost" args={{ variant: "ghost" }} />

<Story name="Icon">
	<Button size="icon" variant="ghost">
		<svg
			xmlns="http://www.w3.org/2000/svg"
			class="icon icon-tabler icon-tabler-layout-sidebar-left-expand"
			width="24"
			height="24"
			viewBox="0 0 24 24"
			stroke-width="2"
			stroke="currentColor"
			fill="none"
			stroke-linecap="round"
			stroke-linejoin="round"
		>
			<path stroke="none" d="M0 0h24v24H0z" fill="none" />
			<path
				d="M4 4m0 2a2 2 0 0 1 2 -2h12a2 2 0 0 1 2 2v12a2 2 0 0 1 -2 2h-12a2 2 0 0 1 -2 -2z"
			/>
			<path d="M9 4v16" />
			<path d="M14 10l2 2l-2 2" />
		</svg>
	</Button>
</Story>

<!-- <Story name="Outline" args={{ variant: "outline" }} /> -->
<!-- <Story name="Link" args={{ variant: "link" }} /> -->
