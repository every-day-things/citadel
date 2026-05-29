export type {
	PlatformAdapter,
	PlatformCapabilities,
	DialogAdapter,
	ClipboardAdapter,
	FileOpenerAdapter,
	WindowAdapter,
} from "./types";
export { PlatformProvider, usePlatform } from "./context";
export { createTauriPlatform, createWebPlatform } from "./create";
export type {
	SettingsManager,
	SettingsSchema,
	SettingsKey,
	SettingsValue,
	LibraryPath,
} from "./settings/types";
