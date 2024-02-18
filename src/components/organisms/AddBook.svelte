<script lang="ts">
	import { createDialog } from "@melt-ui/svelte";
	import { writable } from "svelte/store";

	import { Button } from "$lib/components/ui/button";
	import * as Dialog from "$lib/components/ui/dialog";
	import Input from "$lib/components/ui/input/input.svelte";
	import { commitAddBook } from "$lib/library/addBook";

	import type { ImportableBookMetadata } from "../../bindings";
	import { books } from "../../stores/books";
	import { libraryClient } from "../../stores/library";
	import { pluralize } from "./AddBook";

	type Optional<T> = T | null;

	export let isMetadataEditorOpen = writable(false);
	export let bookMetadata = writable<Optional<ImportableBookMetadata>>(null);

	let authorList = writable<string[]>([]);

	$: $authorList = $bookMetadata?.author_names ?? [];

	const commitAddBookHandler = async () => {
		if ($bookMetadata) {
			const result = await commitAddBook(libraryClient(), $bookMetadata);
			// side effects: update in-cache book list when Library updated
			books.set(await libraryClient().listBooks());
			isMetadataEditorOpen.set(false);
			bookMetadata.set(null);
		}
	};

	$: open.set($isMetadataEditorOpen);
	$: if (!$open) isMetadataEditorOpen.set(false);

	const {
		elements: { portalled, overlay, content, title, close },
		states: { open },
	} = createDialog();
</script>

<Dialog.Portal {portalled}>
	<Dialog.Content bind:open={isMetadataEditorOpen} {overlay} {content} {close}>
		<Dialog.Header>
			<Dialog.Title {title}>Add new book</Dialog.Title>
		</Dialog.Header>
		{#if $bookMetadata === null}
			<p>
				Something went wrong. Probably horribly wrong. If you see this message
				twice, please report an issue on GitHub.
			</p>
		{:else}
			<form>
				<label for="title">Title</label>
				<Input type="text" bind:value={$bookMetadata.title} id="title" />
				<label for="authors">Authors</label>
				<p class="authorCountLabel">
					Adding {$authorList.length}
					{pluralize($authorList.length, "author", "authors")}:
					{#each $authorList as author}
						<span
							class="m-1 whitespace-nowrap rounded-lg bg-blue-200 px-2 py-1 text-sm"
							>{author}</span
						>
						{" "}
					{/each}
				</p>
				<ul id="authors" class="flex flex-col gap-1">
					{#each $authorList as author}
						<li class="flex w-full flex-row justify-between">
							<Input type="text" bind:value={author} class="max-w-72" />
							<button
								class="ml-2"
								on:click={() => {
									const newAuthorList = $authorList.filter((a) => a !== author);
									authorList.set(newAuthorList);
								}}>X</button
							>
						</li>
					{/each}
					<button
						on:click={() => {
							authorList.set([...$authorList, ""]);
						}}>+ add author</button
					>
				</ul>
				<Button variant="default" on:click={commitAddBookHandler} class="mt-6"
					>Add book</Button
				>
			</form>
		{/if}
	</Dialog.Content>
</Dialog.Portal>

<style>
	p {
		color: var(--text-onsecondary);
	}

	.authorCountLabel {
		font-size: 0.875rem;
		line-height: 1.25rem;
		color: var(--text-onsecondary);
	}

	form {
		display: flex;
		flex-direction: column;
		gap: 1rem;
	}
</style>
