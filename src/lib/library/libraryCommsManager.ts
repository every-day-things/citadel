import { initCalibreClient } from "./calibre";
import type { Library, Options } from "./typesLibrary";

export const initClient = (options: Options): Promise<Library> => {
  switch (options.libraryType) {
    case "calibre":
      return initCalibreClient(options);
    default:
      throw new Error(`Unknown library type: ${options.libraryType}`);
  }
};
