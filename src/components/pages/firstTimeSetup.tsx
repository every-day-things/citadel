import { commands } from "@/bindings";
import { safeAsyncEventHandler } from "@/lib/async";
import { isDesktop } from "@/lib/platform";
import { pickLibrary } from "@/lib/services/library";
import { createLibrary } from "@/lib/services/library/_internal/pickLibrary";
import { settings } from "@/stores/settings";
import { Button, Stack, Text, Title } from "@mantine/core";

const openFilePicker = async (): Promise<
	| { type: "existing library selected"; path: string }
	| { type: "new library selected"; path: string }
	| { type: "invalid library path selected" }
> => {
	const path = await pickLibrary();
	if (!path) return { type: "invalid library path selected" };

	const selectedIsValid = await commands.clbQueryIsPathValidLibrary(path);

	if (selectedIsValid) {
		return { type: "existing library selected", path };
	}
	return { type: "new library selected", path };
};

export const FirstTimeSetup = ({
	onLibraryPathPicked,
	onLibraryFSDirectoryHandlePicked,
}: {
	onLibraryPathPicked: () => void;
	onLibraryFSDirectoryHandlePicked: (handle: FileSystemDirectoryHandle) => void;
}) => {
	return (
		<Stack align="center" justify="flex-start" h={"100vh"} p="sm">
			<Title>Welcome to Citadel!</Title>

			<Text>
				Select an existing Calibre library, or choose where to create a new
				library.
			</Text>
			<Button
				onPointerDown={safeAsyncEventHandler(async () => {
					if (isDesktop()) {
						const returnStatus = await openFilePicker();
						if (returnStatus.type === "invalid library path selected") {
							return;
						}

						if (returnStatus.type === "new library selected") {
							await createLibrary(returnStatus.path);
						}
						await settings.set("calibreLibraryPath", returnStatus.path);
						onLibraryPathPicked();
					} else {
						const currentDirHandle = await (
							// This function is experimental, and not yet in the TS types.
							window as typeof window & {
								showDirectoryPicker: () => Promise<FileSystemDirectoryHandle>;
							}
						).showDirectoryPicker();
						if (currentDirHandle === undefined) return;

						await settings.set(
							"calibreLibraryPath",
							`webfilesystem://${currentDirHandle.name}`,
						);
						onLibraryFSDirectoryHandlePicked(currentDirHandle);
						onLibraryPathPicked();
					}
				})}
			>
				Choose Calibre library folder
			</Button>
		</Stack>
	);
};
