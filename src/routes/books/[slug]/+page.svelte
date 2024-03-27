<script lang="ts">
	import type { PageData } from "./$types";
	import BookEditDialog from "./BookEditDialog.svelte";

	export let data: PageData;
</script>

<BookEditDialog bookId={data.id} />
