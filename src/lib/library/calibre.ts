import { commands } from "../../bindings";
import { settings } from "../../stores/settings";
import type { Library, Options } from "./typesLibrary";

const listBooks = async () => {
  const libraryUrl = await settings.get("calibreLibraryPath");
  const results = commands.loadBooksFromDb(libraryUrl);
  return results;
};

export const initCalibreClient = (options: Options): Library => {
  if (options.connectionType === "remote") {
    throw new Error("Remote connection not implemented");
  }

  return {
    listBooks,
  };
};
