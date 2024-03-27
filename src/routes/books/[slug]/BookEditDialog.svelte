<script lang="ts">
	import { writable } from "svelte/store";
	import { createDialog } from "@melt-ui/svelte";
	import * as Dialog from "$lib/components/ui/dialog";
	import BookEditForm from "./BookEditForm.svelte";
	import { getBookMatchingId, pageTitleForBook } from "./helpers";
	import { libraryClientStore } from "../../../stores/library";

	export let bookId: string;
	export let dialogOpen = writable(true);
	const libraryClient = $libraryClientStore;

	const {
		elements: { portalled, overlay, content, title, close },
		states: { open },
	} = createDialog();

	$: open.set($dialogOpen);
	$: if (!$open) dialogOpen.set(false);
</script>

<Dialog.Portal {portalled}>
	<Dialog.Content bind:open={dialogOpen} {overlay} {content} {close}>
		{#await getBookMatchingId(libraryClient, bookId) then book}
			<Dialog.Header>
				<Dialog.Title {title}
					>Editing book info – {pageTitleForBook(book)}</Dialog.Title
				>
			</Dialog.Header>
			<BookEditForm {book} onClose={() => dialogOpen.set(false)} />
		{/await}
	</Dialog.Content>
</Dialog.Portal>
