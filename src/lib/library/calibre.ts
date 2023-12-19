import { commands } from "../../bindings";
import type { Library } from "./backend";

const listBooks = async () => {
  const results = commands.loadBooksFromDb();
  return results;
};

export const initClient = (): Library => {
  return {
    listBooks,
  };
};
