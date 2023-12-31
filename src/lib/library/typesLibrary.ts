import type { CalibreBook } from "../../bindings";

export type Library = {
  listBooks(): Promise<CalibreBook[]>;
};

export type LocalConnectionOptions = {
  connectionType: "local";
  libraryPath: string;
};
export type RemoteConnectionOptions = {
  connectionType: "remote";
  url: string;
};

export type Options =
  | {
      libraryType: "calibre";
    } & (LocalConnectionOptions | RemoteConnectionOptions);
