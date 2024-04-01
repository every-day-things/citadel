import { settings, waitForSettings } from "@/stores/settings";
import { useCallback, useEffect, useState } from "react";
import {
	DEFAULT_CONTEXT_VALUE,
	LibraryContext,
	LibraryContextType,
	LibraryState,
} from "./context";
import { initClient } from "@/lib/library/libraryCommsManager";

interface LibraryProviderProps {
	children: React.ReactNode;
}
export const LibraryProvider = ({ children }: LibraryProviderProps) => {
	const [context, setContext] = useState<LibraryContextType>(
		DEFAULT_CONTEXT_VALUE,
	);

	const initializeLibrary = useCallback(async () => {
		await waitForSettings();
		const calibreLibraryPath = await settings.get("calibreLibraryPath");
		const options = {
			libraryPath: calibreLibraryPath,
			libraryType: "calibre",
			connectionType: "local",
		} as const;
		const client = await initClient({
			...options,
			libraryType: "calibre",
		});
		setContext({
			library: client,
			loading: false,
			error: null,
			state: LibraryState.ready,
		});
	}, []);

	useEffect(() => {
		initializeLibrary().catch(() => {
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
	}, [initializeLibrary]);

	return (
		<LibraryContext.Provider value={context}>
			{!context.loading && children}
		</LibraryContext.Provider>
	);
};
