<script lang="ts">
	import type { HTMLInputAttributes } from "svelte/elements";
	import type { InputEvents } from ".";

	type $$Props = HTMLInputAttributes;
	type $$Events = InputEvents;

	export let value: $$Props["value"] = undefined;
</script>

<input
	bind:value
	on:blur
	on:change
	on:click
	on:focus
	on:focusin
	on:focusout
	on:keydown
	on:keypress
	on:keyup
	on:mouseover
	on:mouseenter
	on:mouseleave
	on:paste
	on:input
	{...$$restProps}
/>

<style>
	input {
		display: flex;
		height: 2.25rem;
		width: 100%;
		border-radius: 0.375rem;
		border: 1px solid var(--bg-secondary);
		background-color: var(--bg-tertiary);
		padding: 0.25rem 0.75rem;
		font-size: 0.875rem;
		box-shadow: 0 1px 2px 0 rgba(0, 0, 0, 0.05);
		transition:
			color 0.2s ease-in-out,
			background-color 0.2s ease-in-out,
			border-color 0.2s ease-in-out;
	}

	input::placeholder {
		color: var(--text-ontertiary);
	}

	input:focus-visible {
		outline: none;
		box-shadow: 0 0 0 1px var(--focus-ring);
	}

	input:disabled {
		cursor: not-allowed;
		opacity: 0.5;
	}
</style>
