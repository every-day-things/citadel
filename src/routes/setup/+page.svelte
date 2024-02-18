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
	import DialogCreateLibrary from "../../components/organisms/DialogCreateLibrary.svelte";

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
<DialogCreateLibrary {maybeCreateNewLibrary} {maybeNewLibraryPath} />

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
