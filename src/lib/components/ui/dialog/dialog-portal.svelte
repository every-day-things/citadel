<script lang="ts">
	import { createDialog, melt } from "@melt-ui/svelte";

	type $$Props = {
		portalled: ReturnType<typeof createDialog>["elements"]["portalled"];
	};

	export let portalled: $$Props["portalled"];
</script>

<div use:melt={$portalled}>
	<slot />
</div>
