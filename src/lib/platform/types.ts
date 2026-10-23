import type { UpdateCheckResult } from "@/bindings";
import type { SettingsManager } from "./settings/types";

export interface PlatformAdapter {
	readonly capabilities: PlatformCapabilities;
	readonly dialogs: DialogAdapter;
	readonly clipboard: ClipboardAdapter;
	readonly fileOpener: FileOpenerAdapter;
	readonly window: WindowAdapter;
	readonly homeDirectory: () => Promise<string | null>;
	readonly menu: { onAddBook(handler: () => void): Promise<() => void> };
	readonly updates: UpdatesAdapter;
	readonly settings: SettingsManager;
}

export interface PlatformCapabilities {
	supportsNativeWindows: boolean;
	canPickLocalFiles: boolean;
	canRevealInFileManager: boolean;
	canCopyToClipboard: boolean;
	canOpenLocalPaths: boolean;
	supportsAutoUpdates: boolean;
	/** Only the desktop build can host the local OPDS server. */
	supportsLocalOpdsServer: boolean;
}

export interface DialogAdapter {
	openFile(options: {
		filters?: { name: string; extensions: string[] }[];
	}): Promise<string | null>;
	openDirectory(options?: { title?: string }): Promise<string | null>;
}

export interface ClipboardAdapter {
	writeText(text: string): Promise<void>;
}

export interface FileOpenerAdapter {
	openPath(path: string): Promise<void>;
	revealInFileManager(path: string): Promise<void>;
}

export interface WindowAdapter {
	show(): Promise<void>;
	hide(): Promise<void>;
	openSettings(): Promise<void>;
	setTheme(theme: "dark" | "light" | null): Promise<void>;
	setBackgroundColor(color: [number, number, number, number]): Promise<void>;
	hideOnClose(): Promise<() => void>;
}

export interface UpdatesAdapter {
	check(): Promise<UpdateCheckResult>;
	install(): Promise<"no-update">;
}
