import { Library } from "@/lib/services/library";
import {
	DEFAULT_CONTEXT_VALUE,
	LibraryContextType,
	LibraryEvents,
	LibraryState,
} from "./context";
import { EventEmitter } from "@/lib/event";

type Action = ActionInitialize | ActionShutdown | ActionError;

interface ActionInitialize {
	type: "init";
	client: Library;
	eventEmitter: EventEmitter<LibraryEvents>;
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
				eventEmitter: action.eventEmitter,
				error: null,
				state: LibraryState.ready,
			};
		case "shutdown":
			return {
				library: null,
				loading: false,
				error: null,
				state: LibraryState.closed,
				eventEmitter: null,
			};
		case "error":
			return {
				library: null,
				loading: false,
				error: action.error,
				state: LibraryState.error,
				eventEmitter: null,
			};
		default:
			return DEFAULT_CONTEXT_VALUE;
	}
};
