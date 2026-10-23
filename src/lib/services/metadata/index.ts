import { isDesktop } from "@/lib/platform/runtime";
import { tauriMetadataService } from "./tauri";
import { webMetadataService } from "./web";
export type { MetadataService } from "./types";
export const metadataService = isDesktop
	? tauriMetadataService
	: webMetadataService;
