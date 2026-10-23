import { commands } from "@/bindings";
import type { MetadataService } from "./types";
const unwrap = <T>(
	result: { status: "ok"; data: T } | { status: "error"; error: string },
): T => {
	if (result.status === "error") throw new Error(result.error);
	return result.data;
};
export const tauriMetadataService: MetadataService = {
	search: async (provider, query, key) =>
		unwrap(await commands.clbQueryMetadataSearch(provider, query, key)),
	byIsbn: async (provider, isbn, key) =>
		unwrap(await commands.clbQueryMetadataByIsbn(provider, isbn, key)),
	test: async (provider, key) => {
		const result = await commands.clbCmdTestMetadataProvider(provider, key);
		return result.status === "ok"
			? { ok: result.data.is_valid, message: result.data.message }
			: { ok: false, message: result.error };
	},
};
