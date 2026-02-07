import type { HardcoverSearchResult, LibraryBook } from "@/bindings";
import { commands } from "@/bindings";
import { useSettings } from "@/stores/settings/store";
import { openPath } from "@tauri-apps/plugin-opener";
import { useMemo, useState } from "react";

export interface HardcoverMessage {
	type: "success" | "error";
	text: string;
}

interface FormSetter {
	setFieldValue: (field: string, value: unknown) => void;
}

interface UseHardcoverBookActionsParams {
	book: LibraryBook;
	allAuthorNames: string[];
	form: FormSetter;
	onUpsertIdentifier: (
		bookId: string,
		identifierId: number | null,
		label: string,
		value: string,
	) => Promise<void>;
	onCreateAuthor: (name: string) => Promise<void>;
}

export interface UseHardcoverBookActionsReturn {
	// State
	hardcoverApiKey: string;
	isFetchingFromHardcover: boolean;
	hardcoverMessage: HardcoverMessage | null;
	isSearchModalOpen: boolean;
	searchQuery: string;
	isSearching: boolean;
	searchResults: HardcoverSearchResult[];
	isbnIdentifier: LibraryBook["identifier_list"][number] | undefined;
	hardcoverIdIdentifier: LibraryBook["identifier_list"][number] | undefined;

	// Actions
	setHardcoverMessage: (message: HardcoverMessage | null) => void;
	setSearchQuery: (query: string) => void;
	setIsSearchModalOpen: (open: boolean) => void;
	fetchFromHardcover: () => Promise<void>;
	openInHardcover: () => Promise<void>;
	searchHardcover: (queryOverride?: string) => Promise<void>;
	selectSearchResult: (result: HardcoverSearchResult) => Promise<void>;
}

export const useHardcoverBookActions = ({
	book,
	allAuthorNames,
	form,
	onUpsertIdentifier,
	onCreateAuthor,
}: UseHardcoverBookActionsParams): UseHardcoverBookActionsReturn => {
	const hardcoverApiKey = useSettings((state) => state.hardcoverApiKey);
	const [isFetchingFromHardcover, setIsFetchingFromHardcover] = useState(false);
	const [hardcoverMessage, setHardcoverMessage] =
		useState<HardcoverMessage | null>(null);
	const [isSearchModalOpen, setIsSearchModalOpen] = useState(false);
	const [searchQuery, setSearchQuery] = useState("");
	const [isSearching, setIsSearching] = useState(false);
	const [searchResults, setSearchResults] = useState<HardcoverSearchResult[]>(
		[],
	);

	const isbnIdentifier = useMemo(
		() => book.identifier_list.find((id) => id.label.toLowerCase() === "isbn"),
		[book.identifier_list],
	);

	const hardcoverIdIdentifier = useMemo(
		() =>
			book.identifier_list.find((id) => id.label.toLowerCase() === "hardcover"),
		[book.identifier_list],
	);

	const fetchFromHardcover = async () => {
		if (!hardcoverApiKey) {
			setHardcoverMessage({
				type: "error",
				text: "Please configure your Hardcover API key in settings first.",
			});
			return;
		}

		if (!isbnIdentifier) {
			setHardcoverMessage({
				type: "error",
				text: "This book needs an ISBN to fetch metadata from Hardcover.",
			});
			return;
		}

		setIsFetchingFromHardcover(true);
		setHardcoverMessage(null);

		try {
			const result = await commands.fetchHardcoverMetadataByIsbn(
				hardcoverApiKey,
				isbnIdentifier.value,
			);

			if (result.status === "ok") {
				const metadata = result.data;

				// Store Hardcover slug as identifier first (triggers book reload + form reset)
				const slug = metadata.slug ?? metadata.hardcover_id?.toString();
				if (slug) {
					await onUpsertIdentifier(
						book.id,
						hardcoverIdIdentifier?.id ?? null,
						"hardcover",
						slug,
					);
				}

				// Yield a microtask so React can flush the state update from
				// onUpsertIdentifier (which triggers book reload → useEffect resets form).
				// Not a hard guarantee, but sufficient in practice with React's sync rendering.
				await new Promise((r) => setTimeout(r, 0));

				// Now set form values (after the reset from the book reload)
				if (metadata.title) {
					form.setFieldValue("title", metadata.title);
				}
				if (metadata.description) {
					form.setFieldValue("description", metadata.description);
				}

				setHardcoverMessage({
					type: "success",
					text: "Successfully fetched metadata from Hardcover!",
				});
			} else {
				setHardcoverMessage({
					type: "error",
					text: result.error,
				});
			}
		} catch (error) {
			const errorMessage =
				error instanceof Error ? error.message : String(error);
			setHardcoverMessage({
				type: "error",
				text: `Error: ${errorMessage}`,
			});
		} finally {
			setIsFetchingFromHardcover(false);
		}
	};

	const openInHardcover = async () => {
		if (!hardcoverIdIdentifier) {
			return;
		}

		try {
			const slug = hardcoverIdIdentifier.value;
			if (!/^[a-z0-9-]+$/.test(slug)) {
				setHardcoverMessage({
					type: "error",
					text: "Invalid Hardcover identifier — expected a slug like 'the-forever-war'",
				});
				return;
			}
			const url = `https://hardcover.app/books/${slug}`;
			await openPath(url);
		} catch (error) {
			console.error("Failed to open Hardcover URL:", error);
			const errorMessage =
				error instanceof Error ? error.message : String(error);
			setHardcoverMessage({
				type: "error",
				text: `Failed to open Hardcover: ${errorMessage}`,
			});
		}
	};

	const searchHardcover = async (queryOverride?: string) => {
		const query = queryOverride ?? searchQuery;

		if (!hardcoverApiKey) {
			setHardcoverMessage({
				type: "error",
				text: "Please configure your Hardcover API key in settings first.",
			});
			return;
		}

		if (!query.trim()) {
			return;
		}

		setIsSearching(true);
		setSearchResults([]);
		setHardcoverMessage(null);

		try {
			const result = await commands.searchHardcoverBooks(
				hardcoverApiKey,
				query,
			);

			if (result.status === "ok") {
				setSearchResults(result.data);
				setIsSearchModalOpen(true);
				if (result.data.length === 0) {
					setHardcoverMessage({
						type: "error",
						text: "No books found for your search query.",
					});
				}
			} else {
				setHardcoverMessage({
					type: "error",
					text: result.error,
				});
			}
		} catch (error) {
			const errorMessage =
				error instanceof Error ? error.message : String(error);
			setHardcoverMessage({
				type: "error",
				text: `Error: ${errorMessage}`,
			});
		} finally {
			setIsSearching(false);
		}
	};

	const selectSearchResult = async (result: HardcoverSearchResult) => {
		if (result.authors && result.authors.length > 0) {
			for (const authorName of result.authors) {
				if (!allAuthorNames.includes(authorName)) {
					await onCreateAuthor(authorName);
				}
			}
		}

		// Store Hardcover slug as identifier (triggers book reload + form reset)
		const slug = result.slug ?? result.hardcover_id.toString();
		await onUpsertIdentifier(
			book.id,
			hardcoverIdIdentifier?.id ?? null,
			"hardcover",
			slug,
		);

		// Yield a microtask so React can flush the state update from
		// onUpsertIdentifier (which triggers book reload → useEffect resets form).
		// Not a hard guarantee, but sufficient in practice with React's sync rendering.
		await new Promise((r) => setTimeout(r, 0));

		// Now set form values (after the reset from the book reload)
		if (result.title) {
			form.setFieldValue("title", result.title);
		}
		if (result.description) {
			form.setFieldValue("description", result.description);
		}
		if (result.authors && result.authors.length > 0) {
			form.setFieldValue("authorList", result.authors);
		}

		setIsSearchModalOpen(false);
		setHardcoverMessage({
			type: "success",
			text: "Successfully populated book data from Hardcover!",
		});
	};

	return {
		hardcoverApiKey,
		isFetchingFromHardcover,
		hardcoverMessage,
		isSearchModalOpen,
		searchQuery,
		isSearching,
		searchResults,
		isbnIdentifier,
		hardcoverIdIdentifier,

		setHardcoverMessage,
		setSearchQuery,
		setIsSearchModalOpen,
		fetchFromHardcover,
		openInHardcover,
		searchHardcover,
		selectSearchResult,
	};
};
