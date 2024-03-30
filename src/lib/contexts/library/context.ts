import { createContext } from "react";
import { Library } from "../../library/_types";

export type LibraryContextType = {
  library: Library;
  loading: false;
  error: Error | null;
} | {
  library: null;
  loading: boolean;
  error: Error | null
}

export const LibraryContext = createContext<LibraryContextType>({
  loading: true,
  library: null,
  error: null
});
