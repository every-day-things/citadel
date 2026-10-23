import { listen } from "@tauri-apps/api/event";
export const onAddBook = (handler: () => void): Promise<() => void> =>
	listen("menu://add-book", handler);
