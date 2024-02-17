import { open } from "@tauri-apps/api/dialog";
import { settings } from "../../stores/settings";
import { initLibrary, libraryClient } from "../../stores/library";
import { books } from "../../stores/books";

import { commands } from "../../bindings";

export async function pickLibrary() {
	const selected = await open({
		multiple: false,
		directory: true,
		recursive: true,
		title: "Select Calibre Library Folder",
	});

	if (typeof selected === "string") {
		return selected;
	} else {
		return undefined;
	}
}

export async function createLibrary(libraryRoot: string) {
	const create = await commands.createLibrary(libraryRoot);
	if (create.status === "error") {
		console.error("Failed to create library", create.error);
		return;
	}
}

export async function selectNewLibrary(libraryRoot: string) {
	await settings.set("calibreLibraryPath", libraryRoot);

	await initLibrary({
		libraryType: "calibre",
		libraryPath: libraryRoot,
		connectionType: "local",
	});
	books.set(await libraryClient().listBooks());
}
