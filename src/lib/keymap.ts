export interface KeymapEventLike {
	key: string;
	metaKey: boolean;
	ctrlKey: boolean;
	shiftKey: boolean;
	altKey: boolean;
}

export interface EditableTargetLike {
	tagName?: string;
	isContentEditable?: boolean;
}

export interface KeymapDispatchEventLike extends KeymapEventLike {
	target?: EditableTargetLike | null;
	preventDefault?: () => void;
}

export interface ParsedChord {
	key: string;
	mod: boolean;
	shift: boolean;
	alt: boolean;
}

export const parseChord = (chord: string): ParsedChord => {
	const parts = chord.toLowerCase().split("+");
	const key = parts.at(-1) ?? "";
	const modifiers = new Set(parts.slice(0, -1));
	return {
		key,
		mod: modifiers.has("mod"),
		shift: modifiers.has("shift"),
		alt: modifiers.has("alt"),
	};
};

export const eventMatchesChord = (
	event: KeymapEventLike,
	chord: string,
): boolean => {
	const parsed = parseChord(chord);
	const modPressed = event.metaKey || event.ctrlKey;
	return (
		event.key.toLowerCase() === parsed.key &&
		modPressed === parsed.mod &&
		event.shiftKey === parsed.shift &&
		event.altKey === parsed.alt
	);
};

const EDITABLE_TAG_NAMES = new Set(["INPUT", "TEXTAREA", "SELECT"]);

export const isEditableTarget = (
	target: EditableTargetLike | null | undefined,
): boolean => {
	if (!target) return false;
	if (target.isContentEditable) return true;
	const tagName = target.tagName?.toUpperCase();
	return tagName !== undefined && EDITABLE_TAG_NAMES.has(tagName);
};

export interface KeyBinding {
	chord: string;
	allowInEditable?: boolean;
	when?: (event: KeymapDispatchEventLike) => boolean;
	onMatch: (event: KeymapDispatchEventLike) => void;
}

export const createKeymapHandler =
	(bindings: KeyBinding[]) =>
	(event: KeymapDispatchEventLike): boolean => {
		const editable = isEditableTarget(event.target);
		for (const binding of bindings) {
			if (editable && !binding.allowInEditable) continue;
			if (!eventMatchesChord(event, binding.chord)) continue;
			if (binding.when && !binding.when(event)) continue;
			event.preventDefault?.();
			binding.onMatch(event);
			return true;
		}
		return false;
	};

export type SelectionDirection = "up" | "down" | "left" | "right";

export const NO_SELECTION = -1;

export interface MoveSelectionOptions {
	index: number;
	count: number;
	columns: number;
	direction: SelectionDirection;
}

export const moveSelection = ({
	index,
	count,
	columns,
	direction,
}: MoveSelectionOptions): number => {
	if (count === 0) return NO_SELECTION;
	if (index < 0) {
		return direction === "down" || direction === "right" ? 0 : NO_SELECTION;
	}
	const current = Math.min(index, count - 1);
	switch (direction) {
		case "right":
			return Math.min(current + 1, count - 1);
		case "left":
			return Math.max(current - 1, 0);
		case "down": {
			const candidate = current + columns;
			if (candidate < count) return candidate;
			const lastRowStart = Math.floor((count - 1) / columns) * columns;
			return current >= lastRowStart ? current : count - 1;
		}
		case "up": {
			const candidate = current - columns;
			return candidate < 0 ? current : candidate;
		}
	}
};
