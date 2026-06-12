import { useVirtualizer } from "@tanstack/react-virtual";
import {
	createContext,
	type MutableRefObject,
	type RefObject,
	useContext,
	useEffect,
	useLayoutEffect,
	useMemo,
	useRef,
	useState,
} from "react";
import type { BookView } from "@/BookView";
import type { LibraryBook } from "@/bindings";
import { LoadingOverlay } from "@/components/ui";
import {
	computeColumnCount,
	computeRowCount,
	rowOfIndex,
	rowSlice,
} from "@/lib/grid-virtual";
import { BookCard } from "../atoms/BookCard";

/**
 * Shelf-grid layout constants. The per-row tracks mirror the old
 * `repeat(auto-fill, minmax(150px, 1fr))` whole-grid layout; the
 * virtualizer needs the same numbers to compute cards per row.
 */
const MIN_COLUMN_WIDTH = 150;
const COLUMN_GAP = 24;
const ROW_GAP = 32;
const PADDING = { top: 20, x: 24, bottom: 24 } as const;
/** Cover height cap (BookCover FLUID_MAX_HEIGHT_PX); rows self-measure after mount. */
const ESTIMATED_ROW_HEIGHT = 230;
const OVERSCAN_ROWS = 4;

/** Scrolls the shelf row containing the given flat book index into view. */
export type ScrollToBookIndex = (index: number) => void;

interface BookGridProps extends BookView {
	/** The page-owned scroll region the virtualizer windows against. */
	scrollElementRef: RefObject<HTMLElement>;
	/**
	 * Receives the grid's scroll-to-index function so keyboard selection can
	 * reach rows that are not currently mounted (use-library-keymap).
	 */
	scrollToBookIndexRef?: MutableRefObject<ScrollToBookIndex | null>;
}

export const BookGrid = ({
	loading,
	bookList,
	onBookOpen,
	selectedBookId,
	scrollElementRef,
	scrollToBookIndexRef,
}: BookGridProps) => {
	const actionsContext = useMemo(() => {
		return {
			onViewBook: onBookOpen,
		};
	}, [onBookOpen]);

	return (
		<bookActionsContext.Provider value={actionsContext}>
			<BookGridPure
				loading={loading}
				bookList={bookList}
				selectedBookId={selectedBookId}
				scrollElementRef={scrollElementRef}
				scrollToBookIndexRef={scrollToBookIndexRef}
			/>
		</bookActionsContext.Provider>
	);
};

const BookGridPure = ({
	loading,
	bookList: books,
	selectedBookId,
	scrollElementRef,
	scrollToBookIndexRef,
}: {
	loading: boolean;
	bookList: LibraryBook[];
	selectedBookId?: LibraryBook["id"] | null;
	scrollElementRef: RefObject<HTMLElement>;
	scrollToBookIndexRef?: MutableRefObject<ScrollToBookIndex | null>;
}) => {
	const actions = useContext(bookActionsContext);

	const wrapperRef = useRef<HTMLDivElement>(null);
	const [columns, setColumns] = useState(1);

	// Cards per row come from the container width (auto-fill exists only in
	// layout, so recompute it whenever the panel resizes).
	useLayoutEffect(() => {
		const wrapper = wrapperRef.current;
		if (!wrapper) return;
		const update = () => {
			setColumns(
				computeColumnCount({
					availableWidth: wrapper.clientWidth - PADDING.x * 2,
					minColumnWidth: MIN_COLUMN_WIDTH,
					columnGap: COLUMN_GAP,
				}),
			);
		};
		update();
		const observer = new ResizeObserver(update);
		observer.observe(wrapper);
		return () => observer.disconnect();
	}, []);

	const virtualizer = useVirtualizer({
		count: computeRowCount(books.length, columns),
		getScrollElement: () => scrollElementRef.current,
		estimateSize: () => ESTIMATED_ROW_HEIGHT,
		gap: ROW_GAP,
		overscan: OVERSCAN_ROWS,
		// Rows start below the wrapper's top padding inside the scroll region.
		scrollMargin: PADDING.top,
	});

	// Hand the keymap a way to reach unmounted rows; once the row scrolls in,
	// the selected card mounts and renders its selection ring from props.
	useEffect(() => {
		if (!scrollToBookIndexRef) return;
		scrollToBookIndexRef.current = (index) => {
			virtualizer.scrollToIndex(rowOfIndex(index, columns), {
				align: "auto",
			});
		};
		return () => {
			scrollToBookIndexRef.current = null;
		};
	}, [scrollToBookIndexRef, virtualizer, columns]);

	return (
		<div
			ref={wrapperRef}
			style={{
				// LoadingOverlay covers the nearest position: relative ancestor.
				position: "relative",
				padding: `${PADDING.top}px ${PADDING.x}px ${PADDING.bottom}px`,
			}}
		>
			<LoadingOverlay visible={loading} />
			<div
				style={{
					position: "relative",
					height: virtualizer.getTotalSize(),
				}}
			>
				{/*
				 * Apple Books shelf, windowed: only rows near the viewport mount.
				 * Each virtual row is its own grid with the computed column count;
				 * the row is as tall as its tallest cover and every cell
				 * bottom-aligns its book (see BookCard.module.css) so the bases
				 * sit on one line.
				 */}
				{virtualizer.getVirtualItems().map((virtualRow) => {
					const { start, end } = rowSlice(
						virtualRow.index,
						columns,
						books.length,
					);
					return (
						<div
							key={virtualRow.key}
							ref={virtualizer.measureElement}
							data-index={virtualRow.index}
							data-books-grid
							style={{
								position: "absolute",
								top: 0,
								left: 0,
								width: "100%",
								transform: `translateY(${virtualRow.start - PADDING.top}px)`,
								display: "grid",
								gridTemplateColumns: `repeat(${columns}, minmax(0, 1fr))`,
								columnGap: COLUMN_GAP,
							}}
						>
							{books.slice(start, end).map((book) => (
								<BookCard
									key={book.id}
									book={book}
									actions={actions}
									selected={book.id === selectedBookId}
								/>
							))}
						</div>
					);
				})}
			</div>
		</div>
	);
};

type BookAction = (bookId: LibraryBook["id"]) => void;
interface BookActionsContext {
	onViewBook: BookAction;
}
const bookActionsContext = createContext<BookActionsContext>(
	null as unknown as BookActionsContext,
);
