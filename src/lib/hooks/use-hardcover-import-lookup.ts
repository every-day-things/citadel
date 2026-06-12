import { useEffect, useRef, useState } from "react";
import type { HardcoverSearchResult } from "@/bindings";
import {
	lookupByIsbn,
	type PendingHardcoverMetadata,
	resolveSearchResult,
	searchHardcoverCombined,
} from "@/lib/hardcover-import";
import { normalizeIsbn } from "@/lib/isbn";
import { useSettings } from "@/stores/settings/store";

export interface HardcoverImportMessage {
	type: "success" | "error";
	text: string;
}

/** How the current pending metadata was produced. */
export type PendingHardcoverSource = "auto" | "manual";

interface PendingEntry {
	metadata: PendingHardcoverMetadata;
	source: PendingHardcoverSource;
}

interface UseHardcoverImportLookupParams {
	/** The imported file's embedded identifier (e.g. an ISBN from an EPUB). */
	fileIdentifier: string | null;
}

export interface UseHardcoverImportLookupReturn {
	// State
	hardcoverApiKey: string;
	pending: PendingHardcoverMetadata | null;
	/** Whether `pending` came from the automatic on-mount lookup or a user action. */
	pendingSource: PendingHardcoverSource | null;
	message: HardcoverImportMessage | null;
	isSearchModalOpen: boolean;
	searchQuery: string;
	isSearching: boolean;
	searchResults: HardcoverSearchResult[];
	/** hardcover_id of the search result matching the file's ISBN, if any. */
	isbnMatchId: number | null;

	// Actions
	clearMessage: () => void;
	setSearchQuery: (query: string) => void;
	closeSearchModal: () => void;
	openSearch: (initialQuery: string) => void;
	searchHardcover: (queryOverride?: string) => Promise<void>;
	selectSearchResult: (result: HardcoverSearchResult) => Promise<void>;
	clearPending: () => void;
}

/**
 * Hardcover metadata lookup for the Add Book (import) flow. Unlike
 * use-hardcover-book-actions this never touches the library — the book does
 * not exist yet. Lookups produce a PendingHardcoverMetadata that the caller
 * applies after the book is created.
 */
export const useHardcoverImportLookup = ({
	fileIdentifier,
}: UseHardcoverImportLookupParams): UseHardcoverImportLookupReturn => {
	const hardcoverApiKey = useSettings((state) => state.hardcoverApiKey);
	const hardcoverAutoLookup = useSettings((state) => state.hardcoverAutoLookup);

	const [pending, setPending] = useState<PendingEntry | null>(null);
	const [message, setMessage] = useState<HardcoverImportMessage | null>(null);
	const [isSearchModalOpen, setIsSearchModalOpen] = useState(false);
	const [searchQuery, setSearchQuery] = useState("");
	const [isSearching, setIsSearching] = useState(false);
	const [searchResults, setSearchResults] = useState<HardcoverSearchResult[]>(
		[],
	);
	const [isbnMatchId, setIsbnMatchId] = useState<number | null>(null);

	const canLookupByIsbn = Boolean(
		hardcoverApiKey && fileIdentifier && normalizeIsbn(fileIdentifier),
	);

	// Guards against stale async resolutions: any lookup, selection, or clear
	// bumps the generation, and an in-flight operation only commits its result
	// if the generation it captured is still current.
	const generationRef = useRef(0);

	const autoLookupFromFileIsbn = async () => {
		if (!hardcoverApiKey || !fileIdentifier) {
			return;
		}

		generationRef.current += 1;
		const generation = generationRef.current;

		try {
			const result = await lookupByIsbn(hardcoverApiKey, fileIdentifier);
			if (generationRef.current !== generation) {
				return;
			}
			// The user didn't ask for this lookup, so a miss stays silent; the
			// "Find on Hardcover…" button remains as the explicit path.
			if (result.ok) {
				setPending({ metadata: result.data, source: "auto" });
			}
		} catch {
			// Silent for the same reason.
		}
	};

	const searchHardcover = async (queryOverride?: string) => {
		const query = (queryOverride ?? searchQuery).trim();

		if (!hardcoverApiKey || !query) {
			return;
		}

		setIsSearching(true);
		setSearchResults([]);
		setIsbnMatchId(null);

		try {
			const combined = await searchHardcoverCombined(
				hardcoverApiKey,
				query,
				fileIdentifier,
			);
			// Empty results leave the modal open showing its empty state.
			setSearchResults(combined.results);
			setIsbnMatchId(combined.isbnMatchId);
		} catch (error) {
			const errorMessage =
				error instanceof Error ? error.message : String(error);
			setMessage({ type: "error", text: `Error: ${errorMessage}` });
		} finally {
			setIsSearching(false);
		}
	};

	const openSearch = (initialQuery: string) => {
		setSearchQuery(initialQuery);
		setSearchResults([]);
		setIsbnMatchId(null);
		setIsSearchModalOpen(true);
		if (initialQuery.trim() || canLookupByIsbn) {
			void searchHardcover(initialQuery);
		}
	};

	const selectSearchResult = async (result: HardcoverSearchResult) => {
		generationRef.current += 1;
		const generation = generationRef.current;
		try {
			const resolved = await resolveSearchResult(hardcoverApiKey, result);
			if (generationRef.current !== generation) {
				return;
			}
			// No success message: the match row under the form is the confirmation.
			setPending({ metadata: resolved, source: "manual" });
			setMessage(null);
			setIsSearchModalOpen(false);
		} catch (error) {
			if (generationRef.current !== generation) {
				return;
			}
			const errorMessage =
				error instanceof Error ? error.message : String(error);
			setMessage({ type: "error", text: `Error: ${errorMessage}` });
		}
	};

	// Auto-lookup once on mount when enabled and the file has a usable ISBN.
	const didAutoLookup = useRef(false);
	// biome-ignore lint/correctness/useExhaustiveDependencies: deliberately fires at most once, guarded by didAutoLookup.
	useEffect(() => {
		if (didAutoLookup.current) {
			return;
		}
		if (!hardcoverAutoLookup || !canLookupByIsbn) {
			return;
		}
		didAutoLookup.current = true;
		void autoLookupFromFileIsbn();
	}, [hardcoverAutoLookup, canLookupByIsbn]);

	return {
		hardcoverApiKey,
		pending: pending?.metadata ?? null,
		pendingSource: pending?.source ?? null,
		message,
		isSearchModalOpen,
		searchQuery,
		isSearching,
		searchResults,
		isbnMatchId,

		clearMessage: () => setMessage(null),
		setSearchQuery,
		closeSearchModal: () => setIsSearchModalOpen(false),
		openSearch,
		searchHardcover,
		selectSearchResult,
		clearPending: () => {
			// Invalidate any in-flight lookup/selection so it cannot resurrect
			// the pending metadata after the user cleared it.
			generationRef.current += 1;
			setPending(null);
		},
	};
};
