import { commands, type CalibreClientConfig } from "../../bindings";
import type { Library, Options } from "./typesLibrary";

const genListBooks = (config: CalibreClientConfig) => async () => {
  const results = commands.calibreLoadBooksFromDb(config.library_path);
  return results;
};

export const initCalibreClient = async (options: Options): Promise<Library> => {
  if (options.connectionType === "remote") {
    throw new Error("Remote connection not implemented");
  }

  const config = await commands.initClient(options.libraryPath);

  return {
    listBooks: genListBooks(config),
  };
};
