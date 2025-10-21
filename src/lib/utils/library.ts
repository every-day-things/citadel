import { open as dialogOpen } from "@tauri-apps/plugin-dialog";
import { type Option, some, none } from "@/lib/option";

export async function selectLibraryFolderDialog(): Promise<Option<string>> {
	const selected = await dialogOpen({
		multiple: false,
		directory: true,
		recursive: true,
		title: "Select Calibre Library Folder",
	});

	if (typeof selected === "string") {
		return some(selected);
	}

	return none();
}
