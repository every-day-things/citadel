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
	onBookOpen: (bookId: LibraryBook["id"]) => void;
	onClearSearch: () => void;
}

const ARROW_CHORDS: [string, SelectionDirection][] = [
	["arrowup", "up"],
	["arrowdown", "down"],
	["arrowleft", "left"],
	["arrowright", "right"],
];

// The cover grid is auto-fill responsive, so its column count exists only in
// layout; read it off the resolved grid-template-columns track list.
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
		setSelectedBookId(nextBook.id);
		document
			.querySelector(`[data-book-id="${CSS.escape(nextBook.id)}"]`)
			?.scrollIntoView({ block: "nearest" });
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
