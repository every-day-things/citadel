import { useVirtualizer } from "@tanstack/react-virtual";
import { useLayoutEffect, useRef, useState } from "react";

const findScrollParent = (element: HTMLElement): HTMLElement | null => {
	for (let node = element.parentElement; node; node = node.parentElement) {
		if (["auto", "scroll"].includes(getComputedStyle(node).overflowY)) {
			return node;
		}
	}
	return null;
};

/**
 * Virtualizes a page-level list of id-keyed rows (series, tags, publishers)
 * inside the nearest scrolling ancestor, and scrolls back to the top when
 * the list itself changes (e.g. a new search term).
 */
export const useNamedCountRows = <T extends { id: number }>(items: T[]) => {
	const rowsRef = useRef<HTMLDivElement>(null);
	const [scrollElement, setScrollElement] = useState<HTMLElement | null>(null);
	const [scrollMargin, setScrollMargin] = useState(0);

	useLayoutEffect(() => {
		const rows = rowsRef.current;
		if (!rows) return;
		const parent = findScrollParent(rows);
		setScrollElement(parent);
		if (!parent) return;

		const measure = () => {
			setScrollMargin(
				rows.getBoundingClientRect().top -
					parent.getBoundingClientRect().top +
					parent.scrollTop,
			);
		};
		measure();
		const observer = new ResizeObserver(measure);
		observer.observe(parent);
		return () => observer.disconnect();
	}, []);

	const virtualizer = useVirtualizer({
		count: items.length,
		getScrollElement: () => scrollElement,
		getItemKey: (index) => items[index]?.id ?? index,
		estimateSize: () => 40,
		overscan: 10,
		scrollMargin,
	});

	const previousItems = useRef(items);
	useLayoutEffect(() => {
		if (previousItems.current !== items) {
			if (scrollElement) scrollElement.scrollTop = 0;
			previousItems.current = items;
		}
	}, [items, scrollElement]);

	return { rowsRef, virtualizer, scrollMargin };
};
