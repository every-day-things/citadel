import { Library } from "@/lib/services/library";
import { DEFAULT_CONTEXT_VALUE, LibraryContextType, LibraryState } from "./context";

type Action = ActionInitialize | ActionShutdown | ActionError;

interface ActionInitialize {
	type: "init";
	client: Library;
}
interface ActionShutdown {
	type: "shutdown";
}
interface ActionError {
	type: "error";
	error: Error;
}

export const reducer = (
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
