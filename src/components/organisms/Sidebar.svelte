<script lang="ts">
	import { page } from "$app/stores";
	import {
		pickLibrary,
		selectNewLibrary,
		createLibrary,
	} from "$lib/library/pickLibrary";
	import { commands } from "../../bindings";
	import { Button } from "$lib/components/ui/button";
	import { writable } from "svelte/store";
	import type { ImportableBookMetadata } from "../../bindings";
	import * as Dialog from "$lib/components/ui/dialog";
	import AddBook from "./AddBook.svelte";
	import { beginAddBookHandler } from "./AddBook";
	import { createDialog } from "@melt-ui/svelte";

	type Optional<T> = T | null;

	let sidebarOpen = false;

	let bookMetadata = writable<Optional<ImportableBookMetadata>>(null);
	let isMetadataEditorOpen = writable(false);
	let maybeCreateNewLibrary = writable(false);
	let maybeNewLibraryPath = writable("");

	let authorList = writable<string[]>([]);

	$: $authorList = $bookMetadata?.author_names ?? [];

	$: if ($bookMetadata) {
		bookMetadata.set({
			...$bookMetadata,
			author_names: $authorList,
		});
	}

	const addBookHandler = async () => {
		const maybeMetadata = await beginAddBookHandler();
		if (maybeMetadata) {
			bookMetadata.set(maybeMetadata);
			isMetadataEditorOpen.set(true);
		}
	};

	const switchLibraryHandler = async () => {
		const path = await pickLibrary();
		if (!path) return;

		const selectedIsValid = await commands.isValidLibrary(path);

		if (selectedIsValid) {
			selectNewLibrary(path);
		} else {
			$maybeNewLibraryPath = path;
			maybeCreateNewLibrary.set(true);
		}
	};

	const {
		elements: { portalled, overlay, content, description, title, close },
	} = createDialog();
</script>

{#if sidebarOpen}
	<nav>
		<button on:click={() => (sidebarOpen = false)}>
			<svg
				xmlns="http://www.w3.org/2000/svg"
				class="icon icon-tabler icon-tabler-layout-sidebar-left-collapse"
				width="24"
				height="24"
				viewBox="0 0 24 24"
				stroke-width="2"
				stroke="currentColor"
				fill="none"
				stroke-linecap="round"
				stroke-linejoin="round"
				><path stroke="none" d="M0 0h24v24H0z" fill="none" /><path
					d="M4 4m0 2a2 2 0 0 1 2 -2h12a2 2 0 0 1 2 2v12a2 2 0 0 1 -2 2h-12a2 2 0 0 1 -2 -2z"
				/><path d="M9 4v16" /><path d="M15 10l-2 2l2 2" /></svg
			>
		</button>
		<div class="group">
			<p class="label">My Library</p>
			<Button variant="secondary" on:click={addBookHandler}>⊕ Add book</Button>
			<AddBook {isMetadataEditorOpen} {bookMetadata} />
			<Button variant="secondary" on:click={switchLibraryHandler}
				>Switch Library</Button
			>
			<a
				href="/setup"
				aria-current={$page.url.pathname === "/setup" ? "page" : undefined}
			>
				First-time setup
			</a>
			<a aria-disabled="true" href="/">Configure library</a>
		</div>
		<div class="group">
			<p class="label">My Shelves</p>
			<a href="/" aria-current={$page.url.pathname === "/" ? "page" : undefined}
				>All books</a
			>
		</div>
		<div class="group">
			<p class="label">Devices</p>
			<!-- <a aria-disabled="true">Kobo Glo (2015)</a> -->
			<p class="note">Devices are coming soon.</p>
		</div>

		<div class="bottom">
			<div>
				<a aria-disabled="true" href="/"> ⚙️ Settings </a>
			</div>
		</div>
	</nav>
{:else}
	<div class="floating-open">
		<button class="open" on:click={() => (sidebarOpen = true)}>
			<svg
				xmlns="http://www.w3.org/2000/svg"
				class="icon icon-tabler icon-tabler-layout-sidebar-left-expand"
				width="24"
				height="24"
				viewBox="0 0 24 24"
				stroke-width="2"
				stroke="currentColor"
				fill="none"
				stroke-linecap="round"
				stroke-linejoin="round"
			>
				<path stroke="none" d="M0 0h24v24H0z" fill="none" />
				<path
					d="M4 4m0 2a2 2 0 0 1 2 -2h12a2 2 0 0 1 2 2v12a2 2 0 0 1 -2 2h-12a2 2 0 0 1 -2 -2z"
				/>
				<path d="M9 4v16" />
				<path d="M14 10l2 2l-2 2" />
			</svg>
		</button>
	</div>
{/if}
<Dialog.Portal {portalled}>
	<Dialog.Content bind:open={maybeCreateNewLibrary} {content} {overlay} {close}>
		<Dialog.Header>
			<Dialog.Title {title}>Create new library</Dialog.Title>
			<Dialog.Description {description}>
				<p>
					There is no library at the path you selected. Would you like to create
					a new library at this location?
				</p>
				<p>You selected: <code>{$maybeNewLibraryPath}</code></p>
				<div class="flex row justify-end gap-4">
					<Button
						variant="secondary"
						on:click={() => {
							maybeCreateNewLibrary.set(false);
							maybeNewLibraryPath.set("");
						}}
						class="mt-6">Cancel</Button
					>
					<Button
						variant="default"
						on:click={() => {
							createLibrary($maybeNewLibraryPath);
							selectNewLibrary($maybeNewLibraryPath);
							$maybeCreateNewLibrary = false;
							$maybeNewLibraryPath = "";
						}}
						class="mt-6">Create library</Button
					>
				</div>
			</Dialog.Description>
		</Dialog.Header>
	</Dialog.Content>
</Dialog.Portal>

<style>
	button:has(svg) {
		background: none;
		border: none;
		padding: 0;
		margin: 0;
		cursor: pointer;
		color: var(--text-onsecondary);
		min-width: 44px;
		display: flex;
		align-items: center;
		justify-content: center;
	}

	button.open:has(svg) {
		color: var(--text-primary);
	}

	.floating-open {
		position: sticky;
		padding: 8px 0;
		z-index: 100;
		background-color: var(--bg-secondary);
	}

	.group {
		display: flex;
		flex-direction: column;
		border-top: 1px solid #444;
		gap: 8px;
		margin-bottom: 8px;
	}
	.group .label {
		margin: 8px 0;
		font-weight: bold;
	}
	.note {
		font-style: italic;
	}

	nav {
		position: sticky;
		display: flex;
		flex-direction: column;
		top: 0;
		height: 100vh;
		padding: 8px 16px;
		background-color: var(--bg-secondary);
		width: 236px;
		min-width: 236px;
		box-sizing: border-box;
	}
	p,
	a {
		color: var(--text-onsecondary);
	}
	a[aria-disabled="true"] {
		color: var(--text-secondary);
		cursor: not-allowed;
	}
	a[aria-disabled="true"]:hover {
		text-decoration: none;
	}

	.bottom {
		padding: 8px;
		margin-top: auto;
		transform: translateY(-100%);
	}

	a[aria-current="page"] {
		color: var(--text-brand);
	}
</style>
