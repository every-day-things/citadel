<script lang="ts">
	import { goto } from "$app/navigation";
	import {
		createLibrary,
		pickLibrary,
		selectNewLibrary,
	} from "$lib/library/pickLibrary";
	import { settings } from "../../stores/settings";
	import { commands } from "../../bindings";
	import { Button } from "$lib/components/ui/button";
	import { writable } from "svelte/store";
	import * as Dialog from "$lib/components/ui/dialog";
	import { fade } from "svelte/transition";

	let maybeCreateNewLibrary = writable(false);
	let maybeNewLibraryPath = writable("");

	const openFilePicker = async () => {
		const path = await pickLibrary();
		if (!path) return;

		const selectedIsValid = await commands.isValidLibrary(path);

		if (selectedIsValid) {
			selectNewLibrary(path);
			goto("/");
		} else {
			$maybeNewLibraryPath = path;
			maybeCreateNewLibrary.set(true);
		}
		if ($settings.calibreLibraryPath !== "") {
		}
	};
</script>

<div>
	<h1>Set up Citadel</h1>
	<label for="library-path">Pick Calibre Library Path</label>
	<Button on:click={openFilePicker} id="library-path">
		Choose Calibre Library Folder
	</Button>
</div>
<Dialog.Root bind:open={$maybeCreateNewLibrary}>
	<Dialog.Content transition={fade}>
		<Dialog.Header>
			<Dialog.Title>Create new library</Dialog.Title>
			<Dialog.Description>
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
							goto("/");
						}}
						class="mt-6">Create library</Button
					>
				</div>
			</Dialog.Description>
		</Dialog.Header>
	</Dialog.Content>
</Dialog.Root>

<style>
	h1 {
		margin-bottom: 4rem;
		font-weight: 700;
	}
	div {
		display: flex;
		flex-direction: column;
		align-items: center;
		justify-content: center;
		width: 100%;
		margin-top: 4rem;
	}

	label {
		margin-bottom: 1rem;
	}
</style>
