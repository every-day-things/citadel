import type {
	BookUpdate,
	HardcoverBookMetadata,
	HardcoverSearchResult,
} from "@/bindings";
import { commands } from "@/bindings";
import { normalizeIsbn } from "@/lib/isbn";

/**
 * Hardcover metadata resolved for a book that has not been created yet
 * (i.e. during import). Field-for-field this mirrors what the Edit Book
 * "Find on Hardcover" flow applies to an existing book.
 */
export interface PendingHardcoverMetadata {
	title: string;
	description: string | null;
	image_url: string | null;
	/** Normalized ISBN (digits + optional X check digit), or null if invalid. */
	isbn: string | null;
	slug: string | null;
	hardcover_id: number | null;
	release_year: number | null;
	authors: string[];
}

/**
 * Resolve a search result into full metadata by fetching the book by its
 * Hardcover id. Resolved fields win; the search result is the fallback for
 * each field (and the only source for authors). If the fetch fails for any
 * reason, falls back entirely to the search result.
 */
export const resolveSearchResult = async (
	apiKey: string,
	result: HardcoverSearchResult,
): Promise<PendingHardcoverMetadata> => {
	let resolved: HardcoverBookMetadata | undefined;
	try {
		const byId = await commands.fetchHardcoverMetadataByBookId(
			apiKey,
			result.hardcover_id,
		);
		if (byId.status === "ok") {
			resolved = byId.data;
		}
	} catch {
		// Fall back to the search result below.
	}

	const isbn = normalizeIsbn(resolved?.isbn ?? result.isbn ?? "") ?? null;

	return {
		title: resolved?.title ?? result.title,
		description: resolved?.description ?? result.description,
		image_url: resolved?.image_url ?? result.image_url,
		isbn,
		slug: resolved?.slug ?? result.slug,
		hardcover_id: resolved?.hardcover_id ?? result.hardcover_id,
		release_year: resolved?.release_year ?? result.release_year,
		authors: result.authors,
	};
};

export type LookupByIsbnResult =
	| { ok: true; data: PendingHardcoverMetadata }
	| { ok: false; error: string };

/**
 * Look up Hardcover metadata for a file's identifier, if it is an ISBN.
 *
 * Deliberately uses search rather than fetchHardcoverMetadataByIsbn because
 * search returns authors; the Rust side uses the same search query for both.
 */
export const lookupByIsbn = async (
	apiKey: string,
	rawIdentifier: string,
): Promise<LookupByIsbnResult> => {
	const normalizedIsbn = normalizeIsbn(rawIdentifier);
	if (!normalizedIsbn) {
		return {
			ok: false,
			error: `This file's identifier ("${rawIdentifier.trim()}") isn't an ISBN, so it can't be looked up on Hardcover.`,
		};
	}

	const searched = await commands.searchHardcoverBooks(apiKey, normalizedIsbn);
	if (searched.status === "error") {
		return { ok: false, error: searched.error };
	}

	// Search is fuzzy, so the first hit may be a different book entirely.
	// Prefer the result whose ISBN matches the one we queried.
	const match =
		searched.data.find(
			(result) => normalizeIsbn(result.isbn ?? "") === normalizedIsbn,
		) ?? searched.data[0];
	if (!match) {
		return {
			ok: false,
			error: `No Hardcover match for ISBN ${normalizedIsbn}.`,
		};
	}

	return { ok: true, data: await resolveSearchResult(apiKey, match) };
};

/**
 * Build a "title firstAuthor" query to prefill the Hardcover search modal.
 */
export const buildSearchQuery = (title: string, authors: string[]): string => {
	const firstAuthor = authors.find((author) => author.trim().length > 0);
	return [title.trim(), firstAuthor?.trim()]
		.filter((part): part is string => Boolean(part))
		.join(" ");
};

export interface ApplyHardcoverDeps {
	upsertBookIdentifier: (
		bookId: string,
		identifierId: number | null,
		label: string,
		value: string,
	) => Promise<void>;
	updateBook: (bookId: string, updates: BookUpdate) => Promise<void>;
	setBookCoverFromUrl: (bookId: string, url: string) => Promise<void>;
}

/**
 * Apply pending Hardcover metadata to a freshly created book.
 *
 * Does NOT upsert an isbn identifier — the import create path stores the
 * ISBN via ImportableBookMetadata.identifier.
 */
export const applyHardcoverMetadataToBook = async (
	bookId: string,
	pending: PendingHardcoverMetadata,
	deps: ApplyHardcoverDeps,
): Promise<void> => {
	const hardcoverIdentifier =
		pending.slug ??
		(pending.hardcover_id !== null ? String(pending.hardcover_id) : null);
	if (hardcoverIdentifier) {
		await deps.upsertBookIdentifier(
			bookId,
			null,
			"hardcover",
			hardcoverIdentifier,
		);
	}

	if (pending.description) {
		await deps.updateBook(bookId, {
			author_id_list: null,
			tag_list: null,
			title: null,
			timestamp: null,
			publication_date: null,
			is_read: null,
			description: pending.description,
		});
	}

	if (pending.image_url) {
		await deps.setBookCoverFromUrl(bookId, pending.image_url);
	}
};
