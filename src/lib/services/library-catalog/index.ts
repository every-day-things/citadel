import { isDesktop } from "@/lib/platform/runtime";
import { tauriLibraryCatalog } from "./tauri";
import { webLibraryCatalog } from "./web";

export type { LibraryCatalog } from "./types";
export const libraryCatalog = isDesktop
	? tauriLibraryCatalog
	: webLibraryCatalog;
