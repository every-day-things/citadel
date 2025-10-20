import { useSettings } from "./store";

// Export store actions for convenient imports
export const setActiveLibrary = (libraryId: string): Promise<void> => {
	return useSettings.getState().setActiveLibrary(libraryId);
};

export const createLibrary = (absolutePath: string): Promise<string> => {
	return useSettings.getState().createLibrary(absolutePath);
};

export const getActiveLibrary = () => {
	return useSettings.getState().getActiveLibrary();
};

export const setTheme = (theme: "dark" | "light" | "auto"): Promise<void> => {
	return useSettings.getState().setTheme(theme);
};

export const setStartFullscreen = (enabled: boolean): Promise<void> => {
	return useSettings.getState().setStartFullscreen(enabled);
};
