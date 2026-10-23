import type { UpdatesAdapter } from "../types";
import { commands, type UpdateCheckResult } from "@/bindings";

const checkForUpdates = async (): Promise<UpdateCheckResult> => {
	const result = await commands.clbCmdCheckForUpdates();

	if (result.status === "error") {
		throw new Error(result.error);
	}

	return result.data;
};

const installUpdateIfAvailable = async (): Promise<"no-update"> => {
	const result = await commands.clbCmdInstallUpdateIfAvailable();

	if (result.status === "error") {
		throw new Error(result.error);
	}

	return result.data as "no-update";
};

export const tauriUpdates: UpdatesAdapter = {
	check: checkForUpdates,
	install: installUpdateIfAvailable,
};
