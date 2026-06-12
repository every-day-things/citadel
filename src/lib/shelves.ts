export interface ShelfTarget {
	title: string;
	path: string;
}

// Order defines the mod+1..mod+9 shelf chords; "All books" must stay first.
// Keep in sync with the destinations rendered in Sidebar.
export const SHELF_TARGETS = [
	{ title: "All Books", path: "/" },
	{ title: "Authors", path: "/authors" },
] as const satisfies readonly ShelfTarget[];

export const MAX_SHELF_CHORDS = 9;

export const chordForShelf = (index: number): string | null =>
	index >= 0 && index < MAX_SHELF_CHORDS ? `mod+${index + 1}` : null;
