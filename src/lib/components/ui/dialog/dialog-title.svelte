<script lang="ts">
	import { melt, type createDialog } from "@melt-ui/svelte";

	type $$Props = {
		title: ReturnType<typeof createDialog>["elements"]["title"];
	};
	export let title: $$Props["title"];
</script>

<h2 use:melt={$title} class="title">
	<slot />
</h2>

<style>
	.title {
		font-size: 1.125rem;
		font-weight: 600;
		line-height: 1;
		letter-spacing: -0.025em;
	}
</style>
