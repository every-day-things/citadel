<script lang="ts">
	import type { HTMLAttributes } from "svelte/elements";

	type $$Props = HTMLAttributes<HTMLDivElement>;
</script>

<div class="dialogFooter" {...$$restProps}>
	<slot />
</div>

<style>
	.dialogFooter {
		display: flex;
		flex-direction: column-reverse;
	}

	@media (min-width: 640px) {
		.dialogFooter {
			flex-direction: row;
			justify-content: flex-end;
		}

		.dialogFooter {
			gap: 0.5rem;
		}
	}
</style>
