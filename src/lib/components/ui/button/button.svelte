<script lang="ts">
	import { type Props, type Events } from ".";

	type $$Props = Props & {
		/**
		 * For when you want your button to be as tall as a mountain.
		 * (Or, you know, the parent element.)
		 */
		fullOnKid?: boolean;
	};
	type $$Events = Events;

	let className: $$Props["class"] = undefined;
	export let variant: $$Props["variant"] = "default";
	export let size: $$Props["size"] = "default";
	export let fullOnKid = false;

	export { className as class };

	console.log($$restProps);
</script>

<button
	type="button"
	{...$$restProps}
	on:click
	on:keydown
	class="{className} button {variant} {size} {fullOnKid ? 'full-on-kid' : ''}"
>
	<slot />
</button>

<style>
	:root {
		--height-default: 2.25rem;
		--font-size-default: 0.875rem;
	}

	button {
		display: inline-flex;
		align-items: center;
		justify-content: center;
		border-radius: 0.375rem;
		font-weight: medium;
		transition:
			background-color 0.2s ease-in-out,
			color 0.2s ease-in-out;
		outline: none;
		box-shadow: var(--button-shadow, none);
		background-color: var(--button-bg-color, transparent);
		color: var(--button-color, currentColor);
		border: var(--button-border, none);
		padding: var(--button-padding-y) var(--button-padding-x);
		height: var(--button-height);
		font-size: var(--button-font-size);
	}

	.full-on-kid {
		height: 100%;
	}

	/*
	==============================
						Size-specific styles
	==============================
	*/
	.default {
		--button-padding-x: 1rem;
		--button-padding-y: 0.5rem;
		--button-height: var(--height-default);
		--button-font-size: var(--font-size-default);
	}

	.sm {
		--button-padding-x: 0.75rem;
		--button-padding-y: 0.25rem;
		--button-height: 2rem;
		--button-font-size: 0.75rem;
	}

	.lg {
		--button-padding-x: 2rem;
		--button-padding-y: 0.5rem;
		--button-height: 2.5rem;
		--button-font-size: var(--font-size-default);
	}

	.icon {
		/* No padding for icon buttons */
		--button-padding-x: 0;
		--button-padding-y: 0;
		--button-height: var(--height-default);
		--button-width: var(--height-default); /* Make it square */
		--button-font-size: 1rem;
	}

	/*
	==============================
					Variant-specific styles
	==============================
	*/
	.default {
		--button-bg-color: var(--bg-brand);
		--button-color: var(--text-onbrand);
		--button-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
	}

	.destructive {
		--button-bg-color: var(--bg-destructive);
		--button-color: var(--text-ondestructive);
		--button-shadow: 0 1px 2px rgba(0, 0, 0, 0.05);
	}

	/* This is not set up, because we don't have border colors set yet. */
	/* .outline {
		--button-bg-color: transparent;
		--button-border: 1px solid var(--border-input, #cbd5e0);
		--button-color: var(--text-color, currentColor);
		--button-shadow: 0 1px 2px rgba(0, 0, 0, 0.05);
	} */

	.secondary {
		--button-bg-color: var(--bg-secondary, #6b7280);
		--button-color: var(--text-secondary-foreground, #ffffff);
		--button-shadow: 0 1px 2px rgba(0, 0, 0, 0.05);
	}

	.ghost {
		--button-bg-color: transparent;
		--button-color: var(--text-primary, currentColor);
		--button-shadow: none;
	}

	.link {
		--button-bg-color: transparent;
		--button-color: var(--text-brand);
		--button-shadow: none;
		--button-border: none;
		--button-text-decoration: underline;
		--button-text-decoration-thickness: 2px;
		--button-text-underline-offset: 4px;
	}

	/*
	==============================
					Hover states
	==============================
	*/
	.button.default:hover {
		--button-bg-color: var(--bg-brand-hover);
	}

	.button.destructive:hover {
		--button-bg-color: var(--bg-destructive-hover,);
	}

	/* .button.outline:hover {
		--button-bg-color: var(
			--bg-accent,
			#e2e8f0
		);
		--button-color: var(
			--text-accent-foreground,
			#1a202c
		);
	} */

	.button.secondary:hover {
		--button-bg-color: var(--bg-secondary-hover);
	}

	.button.ghost:hover {
		--button-bg-color: var(--bg-brand-hover,);
		--button-color: var(--text-onbrand,);
	}

	.button.link:hover {
		text-decoration: underline;
	}
</style>
