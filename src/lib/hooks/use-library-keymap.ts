import { type RefObject, useState } from "react";
import type { LibraryBook } from "@/bindings";
import { useKeymap } from "@/lib/hooks/use-keymap";
import type { KeyBinding, SelectionDirection } from "@/lib/keymap";
import { moveSelection } from "@/lib/keymap";

interface LibraryKeymapOptions {
	books: LibraryBook[];
	drawerOpened: boolean;
	searchInputRef: RefObject<HTMLInputElement>;
	gridContainerRef: RefObject<HTMLElement>;
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
	drawerOpened,
	searchInputRef,
	gridContainerRef,
	scrollToBookIndexRef,
	onBookOpen,
	onClearSearch,
}: LibraryKeymapOptions): { selectedBookId: LibraryBook["id"] | null } => {
	const [selectedBookId, setSelectedBookId] = useState<
		LibraryBook["id"] | null
	>(null);

	const selectedIndex =
		selectedBookId === null
			? -1
			: books.findIndex((book) => book.id === selectedBookId);
	const visibleSelectedBookId = selectedIndex >= 0 ? selectedBookId : null;

	const selectBook = (book: LibraryBook, index: number) => {
		setSelectedBookId(book.id);
		// The grid is virtualized: the target row may not be mounted, so ask
		// the virtualizer to scroll it into view first. When the card is
		// already mounted, the follow-up scrollIntoView fine-tunes alignment;
		// when it is not, the row-level scroll alone places it in view and the
		// card renders selected on the next frame.
		scrollToBookIndexRef?.current?.(index);
		document
			.querySelector(`[data-book-id="${CSS.escape(book.id)}"]`)
			?.scrollIntoView({ block: "nearest" });
	};

	const moveBy = (direction: SelectionDirection) => {
		const nextIndex = moveSelection({
			index: selectedIndex,
			count: books.length,
			columns: measureColumns(gridContainerRef.current),
			direction,
		});
		if (nextIndex < 0) return;
		const nextBook = books[nextIndex];
		if (nextBook === undefined) return;
		selectBook(nextBook, nextIndex);
	};

	// Spotlight-style hand-off: commit the query and drop into the results.
	const leaveSearchForGrid = () => {
		gridContainerRef.current?.focus();
		const firstBook = books[0];
		if (firstBook !== undefined) selectBook(firstBook, 0);
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
