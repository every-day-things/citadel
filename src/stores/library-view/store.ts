import { create } from "zustand";

const PREFS_KEY = "book-form-prefs";

export const LibraryBookSortOrder = {
	nameAz: "name-asc",
	nameZa: "name-desc",
	authorAz: "author-asc",
	authorZa: "author-desc",
} as const;

export type LibraryBookSortOrderKey = keyof typeof LibraryBookSortOrder;

export interface LibraryViewState {
	query: string;
	sortOrder: LibraryBookSortOrderKey;
	view: "covers" | "list";
	hideRead: boolean;

	setQuery: (query: string) => void;
	setSortOrder: (sortOrder: LibraryBookSortOrderKey) => void;
	setView: (view: "covers" | "list") => void;
	setHideRead: (hideRead: boolean) => void;
}

const loadInitial = (): Pick<
	LibraryViewState,
	"query" | "sortOrder" | "view" | "hideRead"
> => {
	const defaults = {
		query: "",
		sortOrder: "authorAz" as LibraryBookSortOrderKey,
		view: "covers" as const,
		hideRead: false,
	};

	try {
		const stored = window.localStorage.getItem(PREFS_KEY);
		if (!stored) return defaults;
		const parsed = JSON.parse(stored) as Partial<typeof defaults>;
		return {
			query: typeof parsed.query === "string" ? parsed.query : defaults.query,
			sortOrder:
				parsed.sortOrder && parsed.sortOrder in LibraryBookSortOrder
					? parsed.sortOrder
					: defaults.sortOrder,
			view:
				parsed.view === "covers" || parsed.view === "list"
					? parsed.view
					: defaults.view,
			hideRead:
				typeof parsed.hideRead === "boolean"
					? parsed.hideRead
					: defaults.hideRead,
		};
	} catch (_e) {
		return defaults;
	}
};

const persist = (state: LibraryViewState) => {
	window.localStorage.setItem(
		PREFS_KEY,
		JSON.stringify({
			query: state.query,
			sortOrder: state.sortOrder,
			view: state.view,
			hideRead: state.hideRead,
		}),
	);
};

export const useLibraryView = create<LibraryViewState>((set, get) => ({
	...loadInitial(),

	setQuery: (query) => {
		set({ query });
		persist(get());
	},
	setSortOrder: (sortOrder) => {
		set({ sortOrder });
		persist(get());
	},
	setView: (view) => {
		set({ view });
		persist(get());
	},
	setHideRead: (hideRead) => {
		set({ hideRead });
		persist(get());
	},
}));
