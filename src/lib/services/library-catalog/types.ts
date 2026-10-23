import type { DetectedLibrary, LibraryStats, SyncStatus } from "@/bindings";
import type { Library, Options } from "../library";

export interface LibraryCatalog {
	open(options: Options): Promise<Library>;
	create(path: string): Promise<void>;
	isValid(path: string): Promise<boolean>;
	detect(): Promise<DetectedLibrary | null>;
	defaultNewPath(): Promise<string>;
	stats(path: string): Promise<LibraryStats>;
	syncStatus(path: string): Promise<SyncStatus>;
}
