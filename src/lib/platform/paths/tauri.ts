import { homeDir } from "@tauri-apps/api/path";
export const homeDirectory = async (): Promise<string | null> =>
	(await homeDir()).replace(/[\\/]+$/, "");
