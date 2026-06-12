import { createContext, useContext, useMemo } from "react";
import type { BookView } from "@/BookView";
import type { LibraryBook } from "@/bindings";
import { LoadingOverlay } from "@/components/ui";
import { BookCard } from "../atoms/BookCard";

export const BookGrid = ({
	loading,
	bookList,
	onBookOpen,
	selectedBookId,
}: BookView) => {
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
			/>
		</bookActionsContext.Provider>
	);
};

const BookGridPure = ({
	loading,
	bookList: books,
	selectedBookId,
}: {
	loading: boolean;
	bookList: LibraryBook[];
	selectedBookId?: LibraryBook["id"] | null;
}) => {
	const actions = useContext(bookActionsContext);

	return (
		<div
			style={{
				// LoadingOverlay covers the nearest position: relative ancestor.
				position: "relative",
				padding: "20px 24px 24px",
			}}
		>
			<LoadingOverlay visible={loading} />
			{/*
			 * Apple Books shelf: uniform flexible columns; each row is as tall
			 * as its tallest cover and every cell bottom-aligns its book
			 * (see BookCard.module.css) so the bases sit on one line.
			 */}
			<div
				data-books-grid
				style={{
					display: "grid",
					gridTemplateColumns: "repeat(auto-fill, minmax(150px, 1fr))",
					columnGap: 24,
					rowGap: 32,
				}}
			>
				{books.map((book) => (
					<BookCard
						key={book.id}
						book={book}
						actions={actions}
						selected={book.id === selectedBookId}
					/>
				))}
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
