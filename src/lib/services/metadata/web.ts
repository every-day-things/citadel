import type { MetadataService } from "./types";
const unavailable = async (): Promise<never> => {
	throw new Error("Metadata lookup is unavailable in the browser");
};
export const webMetadataService: MetadataService = {
	search: unavailable,
	byIsbn: unavailable,
	test: async () => ({
		ok: false,
		message: "Metadata lookup is unavailable in the browser",
	}),
};
