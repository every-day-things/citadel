import { initCalibreClient } from "./adapters/calibre";
import type { Library, Options } from "./_types";

export const initClient = (options: Options): Promise<Library> => {
	switch (options.libraryType) {
		case "calibre":
			return initCalibreClient(options);
		default:
			// The type here is `never` but we're dealing with an unexpected issue
			// at runtime.
			// eslint-disable-next-line @typescript-eslint/restrict-template-expressions
			throw new Error(`Unknown library type: ${options.libraryType}`);
	}
};
