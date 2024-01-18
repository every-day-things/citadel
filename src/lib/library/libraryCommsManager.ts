import { initCalibreClient } from "./adapters/calibre";
import type { Library, Options } from "./_types";

export const initClient = (options: Options): Promise<Library> => {
  switch (options.libraryType) {
    case "calibre":
      return initCalibreClient(options);
    default:
      throw new Error(`Unknown library type: ${options.libraryType}`);
  }
};
