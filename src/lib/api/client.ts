import createClient, { type ClientOptions } from "openapi-fetch";
import type { paths } from "./schema.generated";

/** Typed HTTP transport; authentication and server selection belong to its caller. */
export function createCitadelHttpClient(options: ClientOptions) {
	return createClient<paths>(options);
}
