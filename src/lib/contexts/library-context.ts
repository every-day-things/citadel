import { createContext, useContext } from "react";
import { Library } from "../library/_types";

export const LibraryContext = createContext<Library>({} as Library);

export const useLibrary = () => {
  const library = useContext(LibraryContext);

  return library;
}
