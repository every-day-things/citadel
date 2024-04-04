import { settings, waitForSettings } from "@/stores/settings";
import { useEffect, useReducer } from "react";
import {
	DEFAULT_CONTEXT_VALUE,
	LibraryContext,
	LibraryContextType,
	LibraryState,
} from "./context";
import { Library, initClient } from "@/lib/services/library";

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

type Action =
	| {
			type: "init";
			client: Library;
	  }
	| {
			type: "shutdown";
	  }
	| {
			type: "error";
			error: Error;
	  };

const reducer = (
	_state: LibraryContextType,
	action: Action,
): LibraryContextType => {
	switch (action.type) {
		case "init":
			return {
				library: action.client,
				loading: false,
				error: null,
				state: LibraryState.ready,
			};
		case "shutdown":
			return {
				library: null,
				loading: false,
				error: null,
				state: LibraryState.closed,
			};
		case "error":
			return {
				library: null,
				loading: false,
				error: action.error,
				state: LibraryState.error,
			};
		default:
			return DEFAULT_CONTEXT_VALUE;
	}
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
