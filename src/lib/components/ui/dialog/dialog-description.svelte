<script lang="ts">
	import { createDialog, melt } from "@melt-ui/svelte";

	type $$Props = {
		description: ReturnType<typeof createDialog>["elements"]["description"];
	};

	export let description: $$Props["description"];
</script>

<div use:melt={$description}>
	<slot />
</div>
