import type { EditableTargetLike, KeyBinding } from "@/lib/keymap";
import { createKeymapHandler } from "@/lib/keymap";
import { useEffect, useRef } from "react";

export const useKeymap = (bindings: KeyBinding[]) => {
	const bindingsRef = useRef(bindings);
	bindingsRef.current = bindings;

	useEffect(() => {
		const onKeyDown = (event: KeyboardEvent) => {
			const handler = createKeymapHandler(bindingsRef.current);
			handler({
				key: event.key,
				metaKey: event.metaKey,
				ctrlKey: event.ctrlKey,
				shiftKey: event.shiftKey,
				altKey: event.altKey,
				target: event.target as EditableTargetLike | null,
				preventDefault: () => event.preventDefault(),
			});
		};
		window.addEventListener("keydown", onKeyDown);
		return () => window.removeEventListener("keydown", onKeyDown);
	}, []);
};
