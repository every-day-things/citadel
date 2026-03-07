import { type UpdateCheckResult, commands } from "@/bindings";

export const checkForUpdates = async (): Promise<UpdateCheckResult> => {
	const result = await commands.clbCmdCheckForUpdates();

	if (result.status === "error") {
		throw new Error(result.error);
	}

	return result.data;
};

export const installUpdateIfAvailable = async (): Promise<"no-update"> => {
	const result = await commands.clbCmdInstallUpdateIfAvailable();

	if (result.status === "error") {
		throw new Error(result.error);
	}

	return result.data as "no-update";
};
