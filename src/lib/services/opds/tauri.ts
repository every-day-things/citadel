import type { OpdsStatusError, Result } from "@/bindings";
import { commands } from "@/bindings";
import type { OpdsClient } from "./types";

const unwrap = <T>(result: Result<T, OpdsStatusError>): T => {
	if (result.status === "error") {
		throw new Error(result.error.message);
	}
	return result.data;
};

export const tauriOpdsClient: OpdsClient = {
	status: async () => unwrap(await commands.clbQueryOpdsStatus()),
	start: async (config) => unwrap(await commands.clbCmdStartOpds(config)),
	stop: async () => unwrap(await commands.clbCmdStopOpds()),
	reconfigure: async (config) =>
		unwrap(await commands.clbCmdReconfigureOpds(config)),
	credentialStatus: async () =>
		unwrap(await commands.clbQueryOpdsCredentialStatus()),
	credentialSecret: async () =>
		unwrap(await commands.clbQueryOpdsCredentialSecret()),
	configureCredentials: async ({ username, password }) =>
		unwrap(await commands.clbCmdConfigureOpdsCredentials(username, password)),
	generateCredentials: async (username) =>
		unwrap(await commands.clbCmdGenerateOpdsCredentials(username)),
	clearCredentials: async () =>
		unwrap(await commands.clbCmdClearOpdsCredentials()),
};
