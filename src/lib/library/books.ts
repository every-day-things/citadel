import { commands } from "../../bindings";

export const listBooks = async () => {
  const results = commands.loadBooksFromDb();
  return results;
};
