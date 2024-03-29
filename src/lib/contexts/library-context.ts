import { createContext } from "react";
import { Library } from "../library/_types";

export const LibraryContext = createContext<Library>({} as Library);
