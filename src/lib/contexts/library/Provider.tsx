import { useEffect, useReducer } from "react";
import { DEFAULT_CONTEXT_VALUE, LibraryContext, LibraryState } from "./context";
import { Options, initClient } from "@/lib/services/library";
import { reducer } from "./reducer";

const localLibraryFromPath = (path: string): Options => ({
	libraryPath: path,
	libraryType: "calibre",
	connectionType: "local",
});

interface LibraryProviderProps {
	children: React.ReactNode;
	libraryPath: string;
}
export const LibraryProvider = ({
	children,
	libraryPath,
}: LibraryProviderProps) => {
	const [context, dispatch] = useReducer(reducer, DEFAULT_CONTEXT_VALUE);

	useEffect(() => {
		if (context.state === LibraryState.error) {
			console.log(context.error);
		}
	}, [context]);

	useEffect(() => {
		initClient(localLibraryFromPath(libraryPath))
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
	}, [libraryPath]);

	return (
		<LibraryContext.Provider value={context}>
			{!context.loading && children}
		</LibraryContext.Provider>
	);
};
