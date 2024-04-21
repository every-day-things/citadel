<script lang="ts">
	import { writable } from "svelte/store";

	export let onRemove: () => void;
	export let label: string;

	let isPointerOver = writable(false);
</script>

<!-- svelte-ignore a11y-click-events-have-key-events -->
<!-- svelte-ignore a11y-no-static-element-interactions -->
<!-- svelte-ignore a11y-click-events-have-key-events -->
<div
	class="item py-1 px-2 rounded-xl cursor-default transition-colors text-xs flex items-center"
	on:click={onRemove}
	on:pointerenter={() => {
		$isPointerOver = true;
	}}
	on:pointerleave={() => {
		$isPointerOver = false;
	}}
>
	<span>{label}</span>
	<span class="m-1">{$isPointerOver ? "🞬" : "🞩"}</span>
</div>

<style>
	.item {
		color: var(--text-onprimary);
		background: var(--bg-primary);
	}

	.item:hover {
		color: var(--text-ondestructive);
		background: var(--bg-destructive);
	}
</style>
