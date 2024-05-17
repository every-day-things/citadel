import { useEffect, useReducer } from "react";
import { DEFAULT_CONTEXT_VALUE, LibraryContext, LibraryState } from "./context";
import { Options, initClient } from "@/lib/services/library";
import { reducer } from "./reducer";

const webLibraryFromHandle = (handle: FileSystemDirectoryHandle): Options => ({
	libraryDirectoryHandle: handle,
	libraryType: "calibre",
	connectionType: "web",
});

interface LibraryProviderProps {
	children: React.ReactNode;
	directoryHandle: FileSystemDirectoryHandle;
}
export const WebCalibreLibraryProvider = ({
	children,
	directoryHandle,
}: LibraryProviderProps) => {
	const [context, dispatch] = useReducer(reducer, DEFAULT_CONTEXT_VALUE);

	useEffect(() => {
		if (context.state === LibraryState.error) {
			console.log(context.error);
		}
	}, [context]);

	useEffect(() => {
		initClient(webLibraryFromHandle(directoryHandle))
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
	}, [directoryHandle]);

	return (
		<LibraryContext.Provider value={context}>
			{!context.loading && children}
		</LibraryContext.Provider>
	);
};
