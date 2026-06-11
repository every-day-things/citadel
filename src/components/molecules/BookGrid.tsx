import type { BookView } from "@/BookView";
import type { LibraryBook } from "@/bindings";
import { Box, LoadingOverlay } from "@mantine/core";
import { createContext, useContext, useMemo } from "react";
import { BookCard } from "../atoms/BookCard";

export const BookGrid = ({ loading, bookList, onBookOpen }: BookView) => {
	const actionsContext = useMemo(() => {
		return {
			onViewBook: onBookOpen,
		};
	}, [onBookOpen]);

	return (
		<bookActionsContext.Provider value={actionsContext}>
			<BookGridPure loading={loading} bookList={bookList} />
		</bookActionsContext.Provider>
	);
};

const BookGridPure = ({
	loading,
	bookList: books,
}: {
	loading: boolean;
	bookList: LibraryBook[];
}) => {
	const actions = useContext(bookActionsContext);

	return (
		<Box
			pos="relative"
			style={{
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
				style={{
					display: "grid",
					gridTemplateColumns: "repeat(auto-fill, minmax(150px, 1fr))",
					columnGap: 24,
					rowGap: 32,
				}}
			>
				{books.map((book) => (
					<BookCard key={book.id} book={book} actions={actions} />
				))}
			</div>
		</Box>
	);
};

type BookAction = (bookId: LibraryBook["id"]) => void;
interface BookActionsContext {
	onViewBook: BookAction;
}
const bookActionsContext = createContext<BookActionsContext>(
	null as unknown as BookActionsContext,
);
