import { commands } from "../../bindings";
import { settings } from "../../stores/settings";
import type { Library } from "./backend";

const listBooks = async () => {
  const libraryUrl = await settings.get("calibreLibraryPath");
  const results = commands.loadBooksFromDb(libraryUrl);
  return results;
};

export const initClient = (): Library => {
  return {
    listBooks,
  };
};
