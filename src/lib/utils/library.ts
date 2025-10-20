import { open as dialogOpen } from "@tauri-apps/plugin-dialog";

export async function selectLibraryFolderDialog(): Promise<string | undefined> {
	const selected = await dialogOpen({
		multiple: false,
		directory: true,
		recursive: true,
		title: "Select Calibre Library Folder",
	});

	if (typeof selected === "string") {
		return selected;
	}

	return undefined;
}
