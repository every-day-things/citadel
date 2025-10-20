import { commands } from "@/bindings";
import { safeAsyncEventHandler } from "@/lib/async";
import { selectLibraryFolderDialog } from "@/lib/utils/library";
import { useLibraryStore } from "@/stores/library/store";
import { createLibrary } from "@/stores/settings/actions";
import { setActiveLibrary } from "@/stores/settings/actions";
import { Button, Stack, Text, Title } from "@mantine/core";

export const FirstTimeSetup = () => {
	const createCalibreLibrary = useLibraryStore((state) => state.createLibrary);

	const openFilePicker = async (): Promise<
		| { type: "existing library selected"; path: string }
		| { type: "new library selected"; path: string }
		| { type: "invalid library path selected" }
	> => {
		const path = await selectLibraryFolderDialog();
		if (!path) return { type: "invalid library path selected" };

		const selectedIsValid = await commands.clbQueryIsPathValidLibrary(path);

		if (selectedIsValid) {
			return { type: "existing library selected", path };
		}
		return { type: "new library selected", path };
	};
	return (
		<Stack align="center" justify="flex-start" h={"100vh"} p="sm">
			<Title>Welcome to Citadel!</Title>

			<Text>
				Select an existing Calibre library, or choose where to create a new
				library.
			</Text>
			<Button
				onPointerDown={safeAsyncEventHandler(async () => {
					const returnStatus = await openFilePicker();
					if (returnStatus.type === "invalid library path selected") {
						return;
					}

					if (returnStatus.type === "new library selected") {
						await createCalibreLibrary(returnStatus.path);
					}
					const newLibraryId = await createLibrary(returnStatus.path);
					await setActiveLibrary(newLibraryId);
				})}
			>
				Choose Calibre library folder
			</Button>
		</Stack>
	);
};
