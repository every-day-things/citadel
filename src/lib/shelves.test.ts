import { describe, expect, it } from "vitest";
import { MAX_SHELF_CHORDS, SHELF_TARGETS, chordForShelf } from "./shelves";

describe("SHELF_TARGETS", () => {
	it("puts All Books first so it owns mod+1", () => {
		expect(SHELF_TARGETS[0]).toEqual({ title: "All Books", path: "/" });
	});

	it("fits every shelf within the chordable range", () => {
		expect(SHELF_TARGETS.length).toBeLessThanOrEqual(MAX_SHELF_CHORDS);
	});
});

describe("chordForShelf", () => {
	it("maps shelf order to one-based digit chords", () => {
		expect(chordForShelf(0)).toBe("mod+1");
		expect(chordForShelf(1)).toBe("mod+2");
		expect(chordForShelf(MAX_SHELF_CHORDS - 1)).toBe("mod+9");
	});

	it("returns null outside the chordable range", () => {
		expect(chordForShelf(-1)).toBeNull();
		expect(chordForShelf(MAX_SHELF_CHORDS)).toBeNull();
	});
});
