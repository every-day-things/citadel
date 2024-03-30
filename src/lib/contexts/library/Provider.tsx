import { settings, waitForSettings } from "@/stores/settings";
import { useEffect, useState } from "react";
import { LibraryContext, LibraryContextType } from "./context";
import { initClient } from "@/lib/library/libraryCommsManager";

interface LibraryProviderProps {
	children: React.ReactNode;
}
export const LibraryProvider = ({ children }: LibraryProviderProps) => {
	const [context, setContext] = useState<LibraryContextType>({
		loading: true,
		library: null,
		error: null,
	});

	useEffect(() => {
		void (async (): Promise<void> => {
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
			});
		})();

		return () => {
			setContext({
				library: null,
				loading: false,
				error: new Error("Library context was shut down"),
			});
		};
	});

	return (
		<LibraryContext.Provider value={context}>
			{!context.loading && children}
		</LibraryContext.Provider>
	);
};
