import type { BookView } from "@/BookView";
import type { LibraryBook } from "@/bindings";
import { Box, LoadingOverlay, SimpleGrid } from "@mantine/core";
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
				padding: "0.45rem",
				borderRadius: "12px",
				backgroundColor: "var(--ctd-surface-soft)",
				border: "1px solid var(--ctd-border)",
			}}
		>
			<LoadingOverlay visible={loading} />
			<SimpleGrid
				cols={{ base: 2, md: 4, lg: 5 }}
				spacing="lg"
				verticalSpacing="xl"
				style={{ alignItems: "end" }}
			>
				{books.map((book) => (
					<BookCard key={book.id} book={book} actions={actions} />
				))}
			</SimpleGrid>
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
