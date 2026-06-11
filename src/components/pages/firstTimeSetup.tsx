import { commands } from "@/bindings";
import { Button } from "@/components/ui";
import { safeAsyncEventHandler } from "@/lib/async";
import { usePlatform } from "@/lib/platform/context";
import { useLibraryStore } from "@/stores/library/store";
import { createLibrary, setActiveLibrary } from "@/stores/settings/actions";
import styles from "./firstTimeSetup.module.css";

export const FirstTimeSetup = () => {
	const actions = useLibraryStore((state) => state.actions);
	const platform = usePlatform();

	const openFilePicker = async (): Promise<
		| { type: "existing library selected"; path: string }
		| { type: "new library selected"; path: string }
		| { type: "invalid library path selected" }
	> => {
		const path = await platform.dialogs.openDirectory({
			title: "Select Calibre Library Folder",
		});
		if (path === null) return { type: "invalid library path selected" };

		const selectedIsValid = await commands.clbQueryIsPathValidLibrary(path);

		if (selectedIsValid) {
			return { type: "existing library selected", path };
		}
		return { type: "new library selected", path };
	};
	return (
		<div className={styles.page}>
			<h1 className={styles.title}>Welcome to Citadel!</h1>

			<p className={styles.text}>
				Select an existing Calibre library, or choose where to create a new
				library.
			</p>
			<Button
				variant="primary"
				onClick={safeAsyncEventHandler(async () => {
					const returnStatus = await openFilePicker();
					if (returnStatus.type === "invalid library path selected") {
						return;
					}

					if (returnStatus.type === "new library selected") {
						await actions.createLibrary(returnStatus.path);
					}
					const newLibraryId = await createLibrary(returnStatus.path);
					await setActiveLibrary(newLibraryId);
				})}
			>
				Choose Calibre library folder
			</Button>
		</div>
	);
};
