import { settings, waitForSettings } from "@/stores/settings";
import { useEffect, useState } from "react";
import {
	DEFAULT_CONTEXT_VALUE,
	LibraryContext,
	LibraryContextType,
	LibraryState,
} from "./context";
import { initClient } from "@/lib/services/library";

const initializeLibrary = async () => {
	await waitForSettings();
	const calibreLibraryPath = await settings.get("calibreLibraryPath");
	const options = {
		libraryPath: calibreLibraryPath,
		libraryType: "calibre",
		connectionType: "local",
	} as const;

	return initClient(options);
};

interface LibraryProviderProps {
	children: React.ReactNode;
}
export const LibraryProvider = ({ children }: LibraryProviderProps) => {
	const [context, setContext] = useState<LibraryContextType>(
		DEFAULT_CONTEXT_VALUE,
	);

	useEffect(() => {
		initializeLibrary()
			.then((client) => {
				setContext({
					library: client,
					loading: false,
					error: null,
					state: LibraryState.ready,
				});
			})
			.catch(() => {
				console.error("Failed to init library");
			});

		return () => {
			setContext({
				library: null,
				loading: false,
				error: new Error("Library context was shut down"),
				state: LibraryState.error,
			});
		};
	}, []);

	return (
		<LibraryContext.Provider value={context}>
			{!context.loading && children}
		</LibraryContext.Provider>
	);
};
