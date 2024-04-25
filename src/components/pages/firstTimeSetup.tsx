import { commands } from "@/bindings";
import { safeAsyncEventHandler } from "@/lib/async";
import { pickLibrary } from "@/lib/services/library";
import { settings } from "@/stores/settings";
import { Button, Stack, Text, Title } from "@mantine/core";

const openFilePicker = async () => {
	const path = await pickLibrary();
	if (!path) return;

	const selectedIsValid = await commands.clbQueryIsPathValidLibrary(path);

	if (selectedIsValid) {
		await settings.set("calibreLibraryPath", path);
		return "existing library selected";
	}
	return "new library selected";
};

export const FirstTimeSetup = ({
	onLibraryPathPicked,
}: { onLibraryPathPicked: () => void }) => {
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
					if (returnStatus === "existing library selected") {
						onLibraryPathPicked();
					}
				})}
			>
				Choose Calibre library folder
			</Button>
		</Stack>
	);
};
