import { thumbHashToDataURL } from "thumbhash";

// Decoded placeholders are tiny (~1–2 KB data URLs) and books re-mount
// constantly in the virtualized grid, so decode each distinct hash once.
const decoded = new Map<string, string>();

/**
 * A base64 thumbhash (as produced by the backend's thumbnail command)
 * decoded to a PNG data URL, or undefined for a malformed hash.
 */
export const thumbhashToDataUrl = (base64Hash: string): string | undefined => {
	const cached = decoded.get(base64Hash);
	if (cached !== undefined) return cached;
	try {
		const bytes = Uint8Array.from(atob(base64Hash), (char) =>
			char.charCodeAt(0),
		);
		const dataUrl = thumbHashToDataURL(bytes);
		decoded.set(base64Hash, dataUrl);
		return dataUrl;
	} catch {
		return undefined;
	}
};
