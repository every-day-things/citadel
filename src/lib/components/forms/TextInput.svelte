<script lang="ts">
	import { Input } from "../ui/input";

	export let title;
</script>

<label for="title">Title</label>
<Input type="text" bind:value={$title} id="title" />
