<script lang="ts">
	import { Dialog as DialogPrimitive } from "bits-ui";
	import { createDialog, melt } from "@melt-ui/svelte";

	export let overlay: ReturnType<typeof createDialog>["elements"]["overlay"];
	export let transition: Required<DialogPrimitive.OverlayProps>["transition"];
	export let transitionConfig: DialogPrimitive.OverlayProps["transitionConfig"];
</script>

<div
	use:melt={$overlay}
	class="overlay"
	transition:transition={transitionConfig}
/>

<style>
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
</style>
