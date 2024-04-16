import { settings, waitForSettings } from "@/stores/settings";
import { useEffect, useReducer } from "react";
import {
	DEFAULT_CONTEXT_VALUE,
	LibraryContext,
	LibraryState,
} from "./context";
import { initClient } from "@/lib/services/library";
import { reducer } from "./reducer";

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
	const [context, dispatch] = useReducer(reducer, DEFAULT_CONTEXT_VALUE);

	useEffect(() => {
		if (context.state === LibraryState.error) {
			console.log(context.error);
		}
	}, [context]);

	useEffect(() => {
		initializeLibrary()
			.then((client) => {
				dispatch({
					type: "init",
					client,
				});
			})
			.catch(() => {
				dispatch({ type: "error", error: new Error("Failed to init Library") });
			});

		return () => {
			dispatch({ type: "shutdown" });
		};
	}, []);

	return (
		<LibraryContext.Provider value={context}>
			{!context.loading && children}
		</LibraryContext.Provider>
	);
};
