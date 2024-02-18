<script lang="ts">
	import { goto } from "$app/navigation";
	import { Button } from "$lib/components/ui/button";
	import * as Dialog from "$lib/components/ui/dialog";
	import { createLibrary, selectNewLibrary } from "$lib/library/pickLibrary";
	import { createDialog } from "@melt-ui/svelte";
	import { writable } from "svelte/store";
	const {
		elements: { portalled, overlay, content, description, title, close },
		states: { open },
	} = createDialog();

	export let maybeCreateNewLibrary = writable(false);
	export let maybeNewLibraryPath = writable("");

	$: open.set($maybeCreateNewLibrary);
	$: if (!$open) maybeCreateNewLibrary.set(false);
</script>

<Dialog.Portal {portalled}>
	<Dialog.Content bind:open={maybeCreateNewLibrary} {content} {overlay} {close}>
		<Dialog.Header>
			<Dialog.Title {title}>Create new library</Dialog.Title>
			<Dialog.Description {description}>
				<p>
					There is no library at the path you selected. Would you like to create
					a new library at this location?
				</p>
			</Dialog.Description>
		</Dialog.Header>
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
					goto("/");
				}}
				class="mt-6">Create library</Button
			>
		</div>
	</Dialog.Content>
</Dialog.Portal>
