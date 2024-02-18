<script lang="ts">
	import type { HTMLAttributes } from "svelte/elements";

	type $$Props = HTMLAttributes<HTMLDivElement>;
</script>

<div class="header" {...$$restProps}>
	<slot />
</div>

<style>
	.header {
		display: flex;
		flex-direction: column;
		text-align: center;
	}

	.header {
		margin-top: 0.375rem;
	}

	@media (min-width: 640px) {
		.header {
			text-align: left;
		}
	}
</style>
