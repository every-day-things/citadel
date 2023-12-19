import type { CalibreBook } from "../../bindings";

export type Library = {
  listBooks(): Promise<CalibreBook[]>;
};
