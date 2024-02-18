<script lang="ts">
	import { melt } from "@melt-ui/svelte";
	import { fade } from "svelte/transition";
	import * as Dialog from ".";
	import { Cross2 } from "radix-icons-svelte";
	import { writable } from "svelte/store";

	export let open = writable(false);
	export let overlay: any;
	export let content: any;
	export let close: any;
</script>

{#if $open}
	<Dialog.Overlay
		{overlay}
		transition={fade}
		transitionConfig={{ duration: 150 }}
	/>
	<div
		use:melt={$content}
		class="dialog-content"
		transition:fade={{ duration: 150 }}
	>
		<slot />
		<button use:melt={$close} class="close">
			<Cross2 class="icon" />
			<span class="sr-only">Close</span>
		</button>
	</div>
{/if}

<style>
	.icon {
		height: 1rem;
		width: 1rem;
	}

	.overlay {
		position: fixed;
		inset: 0;
		z-index: 50;
		width: 100vw;
		height: 100vh;
		background-color: rgba(var(--bg-primary_rgb) / 80%);
		backdrop-filter: blur(4px);
		opacity: 1;
	}

	.close {
		position: absolute;
		right: 1rem;
		top: 1rem;
		border-radius: 0.125rem;
		opacity: 0.7;
		transition: opacity 0.2s;
		/* Assuming --ring-offset-background-color is defined in your :root or specific element */
		--ring-offset-background-color: transparent; /* Placeholder - define this variable according to your theme */
	}

	.close:hover {
		opacity: 1;
	}

	.close:focus {
		outline: none;
		box-shadow:
			0 0 0 2px var(--ring-color, #bbb),
			0 0 0 4px var(--ring-offset-background-color);
		/* Replace --ring-color with your project's ring color variable or specific value */
	}

	.close:disabled {
		pointer-events: none;
	}

	/* Custom attribute selector for state management */
	[data-state="open"] .close {
		background: var(
			--bg-accent
		); /* Define --bg-accent according to your theme */
		color: var(
			--text-muted-foreground
		); /* Define --text-muted-foreground according to your theme */
	}

	.dialog-content {
		position: fixed;
		background-color: var(--bg-primary);
		left: 50%;
		top: 50%;
		z-index: 50;
		display: grid;
		max-width: 32rem;
		transform: translate(-50%, -50%);
		grid-gap: 1rem;
		border: 1px transparent;
		padding: 1.5rem;
		box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
		box-shadow:
			0 10px 15px -3px rgba(0, 0, 0, 0.1),
			0 4px 6px -2px rgba(0, 0, 0, 0.05); /* Example shadow, adjust as needed */
		border-radius: 0.5rem;
		width: 100%;
		opacity: 1;
	}

	@media (min-width: 768px) {
		.dialog-content {
			border-radius: 0.375rem;
			width: 100%;
		}
	}

	@media (min-width: 1024px) {
		.dialog-content {
			width: 100%;
		}
	}
</style>
