import { type RefObject, useEffect, useState } from "react";
import type { LibraryBook } from "@/bindings";
import { useKeymap } from "@/lib/hooks/use-keymap";
import type { KeyBinding, SelectionDirection } from "@/lib/keymap";
import { moveSelection } from "@/lib/keymap";

interface LibraryKeymapOptions {
	/**
	 * Indexed view of the filtered library: length is the total match count,
	 * `undefined` entries are books whose page has not been fetched yet.
	 * Selection tracks the INDEX, so arrow keys can move onto an unfetched
	 * slot; the scroll-into-view below makes its page load, and the
	 * selection ring appears once the book arrives.
	 */
	books: (LibraryBook | undefined)[];
	/**
	 * Identity of the filter behind `books` (the paged cache key). Selection
	 * is positional, so it resets when the filter changes — index 4 of a new
	 * result set is an unrelated book.
	 */
	resetToken?: string;
	drawerOpened: boolean;
	searchInputRef: RefObject<HTMLInputElement | null>;
	gridContainerRef: RefObject<HTMLElement | null>;
	/**
	 * The virtualized grid's scroll-to-index function (BookGrid). Selection
	 * can land on a row that is not mounted; this brings the row into view so
	 * the selected card mounts and renders its ring.
	 */
	scrollToBookIndexRef?: RefObject<((index: number) => void) | null>;
	onBookOpen: (bookId: LibraryBook["id"]) => void;
	onClearSearch: () => void;
}

const ARROW_CHORDS: [string, SelectionDirection][] = [
	["arrowup", "up"],
	["arrowdown", "down"],
	["arrowleft", "left"],
	["arrowright", "right"],
];

// The cover grid's column count exists only in layout (it is derived from
// the container width); read it off the resolved grid-template-columns track
// list of any mounted shelf row.
const measureColumns = (container: HTMLElement | null): number => {
	const grid = container?.querySelector("[data-books-grid]");
	if (!(grid instanceof HTMLElement)) return 1;
	const tracks = window.getComputedStyle(grid).gridTemplateColumns;
	const count = tracks.split(" ").filter((track) => track !== "").length;
	return Math.max(count, 1);
};

export const useLibraryKeymap = ({
	books,
	resetToken,
	drawerOpened,
	searchInputRef,
	gridContainerRef,
	scrollToBookIndexRef,
	onBookOpen,
	onClearSearch,
}: LibraryKeymapOptions): { selectedBookId: LibraryBook["id"] | null } => {
	const [selectedIndex, setSelectedIndex] = useState<number>(-1);

	// New filter, new result set: positional selection no longer points at
	// the book the user picked.
	// biome-ignore lint/correctness/useExhaustiveDependencies: resetToken exists solely to trigger this reset.
	useEffect(() => {
		setSelectedIndex(-1);
	}, [resetToken]);

	const inRange = selectedIndex >= 0 && selectedIndex < books.length;
	const selectedBook = inRange ? books[selectedIndex] : undefined;
	const visibleSelectedBookId = selectedBook?.id ?? null;

	const selectIndex = (index: number) => {
		setSelectedIndex(index);
		// The grid is virtualized: the target row may not be mounted, so ask
		// the virtualizer to scroll it into view first (which also pages the
		// books covering it in). When the card is already mounted, the
		// follow-up scrollIntoView fine-tunes alignment; when it is not, the
		// row-level scroll alone places it in view and the card renders
		// selected once its book arrives.
		scrollToBookIndexRef?.current?.(index);
		const book = books[index];
		if (book !== undefined) {
			document
				.querySelector(`[data-book-id="${CSS.escape(book.id)}"]`)
				?.scrollIntoView({ block: "nearest" });
		}
	};

	const moveBy = (direction: SelectionDirection) => {
		const nextIndex = moveSelection({
			index: inRange ? selectedIndex : -1,
			count: books.length,
			columns: measureColumns(gridContainerRef.current),
			direction,
		});
		if (nextIndex < 0 || nextIndex >= books.length) return;
		selectIndex(nextIndex);
	};

	// Spotlight-style hand-off: commit the query and drop into the results.
	const leaveSearchForGrid = () => {
		gridContainerRef.current?.focus();
		if (books.length > 0) selectIndex(0);
	};

	const bindings: KeyBinding[] = [];

	if (!drawerOpened) {
		bindings.push(
			{
				chord: "mod+f",
				allowInEditable: true,
				onMatch: () => {
					searchInputRef.current?.focus();
					searchInputRef.current?.select();
				},
			},
			{
				chord: "escape",
				allowInEditable: true,
				when: () => document.activeElement === searchInputRef.current,
				onMatch: () => {
					onClearSearch();
					gridContainerRef.current?.focus();
				},
			},
			{
				chord: "enter",
				allowInEditable: true,
				when: () => document.activeElement === searchInputRef.current,
				onMatch: leaveSearchForGrid,
			},
			{
				chord: "arrowdown",
				allowInEditable: true,
				when: () => document.activeElement === searchInputRef.current,
				onMatch: leaveSearchForGrid,
			},
		);
		for (const [chord, direction] of ARROW_CHORDS) {
			bindings.push({ chord, onMatch: () => moveBy(direction) });
		}
		if (visibleSelectedBookId !== null) {
			bindings.push({
				chord: "enter",
				onMatch: () => onBookOpen(visibleSelectedBookId),
			});
		}
	}

	useKeymap(bindings);

	return { selectedBookId: visibleSelectedBookId };
};
