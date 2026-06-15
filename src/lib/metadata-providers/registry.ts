import type { BookMetadata } from "@/bindings";
import { commands } from "@/bindings";
import type { ProviderAdapter, ProviderDescriptor, ProviderId } from "./types";

/**
 * Every known provider, in the default preference order (authoritative MARC
 * libraries first, the commercial source last). Settings may reorder a user's
 * own preference; this is only the default and the canonical id list.
 */
export const PROVIDER_IDS = [
	"loc",
	"dnb",
	"k10plus",
	"openlibrary",
	"hardcover",
] as const satisfies readonly ProviderId[];

const DESCRIPTORS: Record<ProviderId, ProviderDescriptor> = {
	loc: {
		id: "loc",
		displayName: "Library of Congress",
		blurb:
			"The U.S. national library. Authoritative records and subjects; no account needed.",
		capabilities: {
			requiresKey: false,
			hasCovers: false,
			hasSubjects: true,
			hasLanguage: true,
			supportsFreeTextSearch: true,
		},
		deepLink: (book) =>
			book.provider_id ? `https://lccn.loc.gov/${book.provider_id}` : null,
	},
	dnb: {
		id: "dnb",
		displayName: "Deutsche Nationalbibliothek",
		blurb:
			"The German national library. Strong for German-language titles; no account needed.",
		capabilities: {
			requiresKey: false,
			hasCovers: false,
			hasSubjects: true,
			hasLanguage: true,
			supportsFreeTextSearch: true,
		},
		deepLink: (book) =>
			book.provider_id ? `https://d-nb.info/${book.provider_id}` : null,
	},
	k10plus: {
		id: "k10plus",
		displayName: "K10plus",
		blurb:
			"A large European union catalogue (GBV/SWB). Broad, authoritative records; no account needed.",
		capabilities: {
			requiresKey: false,
			hasCovers: false,
			hasSubjects: true,
			hasLanguage: true,
			supportsFreeTextSearch: true,
		},
		deepLink: (book) =>
			book.provider_id
				? `https://opac.k10plus.de/DB=2.1/PPNSET?PPN=${book.provider_id}`
				: null,
	},
	openlibrary: {
		id: "openlibrary",
		displayName: "Open Library",
		blurb:
			"The Internet Archive's open catalogue. Often has cover art; no account needed.",
		capabilities: {
			requiresKey: false,
			hasCovers: true,
			hasSubjects: true,
			hasLanguage: false,
			supportsFreeTextSearch: true,
		},
		deepLink: (book) =>
			book.provider_id
				? `https://openlibrary.org/books/${book.provider_id}`
				: null,
	},
	hardcover: {
		id: "hardcover",
		displayName: "Hardcover",
		blurb: "A reader-focused book database. Requires a free API key.",
		capabilities: {
			requiresKey: true,
			hasCovers: true,
			hasSubjects: false,
			hasLanguage: false,
			supportsFreeTextSearch: true,
		},
		deepLink: (book) =>
			book.slug ? `https://hardcover.app/books/${book.slug}` : null,
	},
};

const unwrap = (
	result:
		| { status: "ok"; data: BookMetadata[] }
		| { status: "error"; error: string },
): BookMetadata[] => {
	if (result.status === "error") {
		throw new Error(result.error);
	}
	return result.data;
};

/**
 * Build an adapter for a descriptor. Every provider speaks the same three
 * provider-agnostic Tauri commands, so one factory serves all of them — the
 * only per-provider data is the descriptor.
 */
const makeAdapter = (descriptor: ProviderDescriptor): ProviderAdapter => ({
	descriptor,
	search: async (query, config) =>
		unwrap(
			await commands.clbQueryMetadataSearch(
				descriptor.id,
				query,
				config.apiKey,
			),
		),
	searchByIsbn: async (isbn, config) =>
		unwrap(
			await commands.clbQueryMetadataByIsbn(descriptor.id, isbn, config.apiKey),
		),
	test: async (config) => {
		const result = await commands.clbCmdTestMetadataProvider(
			descriptor.id,
			config.apiKey,
		);
		return result.status === "ok"
			? { ok: result.data.is_valid, message: result.data.message }
			: { ok: false, message: result.error };
	},
});

const ADAPTERS: Record<ProviderId, ProviderAdapter> = {
	loc: makeAdapter(DESCRIPTORS.loc),
	dnb: makeAdapter(DESCRIPTORS.dnb),
	k10plus: makeAdapter(DESCRIPTORS.k10plus),
	openlibrary: makeAdapter(DESCRIPTORS.openlibrary),
	hardcover: makeAdapter(DESCRIPTORS.hardcover),
};

export const getDescriptor = (id: ProviderId): ProviderDescriptor =>
	DESCRIPTORS[id];

export const getAdapter = (id: ProviderId): ProviderAdapter => ADAPTERS[id];

/** Resolve a record's public URL via its provider's deep-link rule. */
export const deepLinkFor = (book: BookMetadata): string | null =>
	DESCRIPTORS[book.provider].deepLink(book);

/**
 * Resolve a public URL from a stored book identifier (label + value), so the
 * Edit Book deep-link button works for any provider's identifier without the
 * full record. Returns null when the label isn't a known provider.
 */
export const deepLinkForIdentifier = (
	label: string,
	value: string,
): string | null => {
	if (!value) return null;
	switch (label.toLowerCase()) {
		case "hardcover":
			return /^[a-z0-9-]+$/.test(value)
				? `https://hardcover.app/books/${value}`
				: null;
		case "lccn":
			return `https://lccn.loc.gov/${value}`;
		case "dnb":
			return `https://d-nb.info/${value}`;
		case "k10plus":
			return `https://opac.k10plus.de/DB=2.1/PPNSET?PPN=${value}`;
		case "openlibrary":
			return `https://openlibrary.org/books/${value}`;
		default:
			return null;
	}
};
