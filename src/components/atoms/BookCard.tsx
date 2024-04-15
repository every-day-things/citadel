import React, { useCallback } from "react";
import { LibraryBook } from "@/bindings";
import { Card, Center } from "@mantine/core";
import { BookCover } from "./BookCover";

type BookAction = (bookId: LibraryBook["id"]) => void;

interface BookActions {
	onViewBook: BookAction;
}

interface BookCard {
	book: LibraryBook;
	actions: BookActions;
}

export const BookCard = React.memo(function BookCard({
	book,
	actions: { onViewBook },
}: BookCard) {
	const onCoverTouch = useCallback(() => {
		onViewBook(book.id);
	}, [onViewBook, book]);

	return (
		<>
			<Card m="xs" flex={1}>
				<Card.Section p={4}>
					<Center>
						<BookCover book={book} onPointerDown={onCoverTouch} />
					</Center>
				</Card.Section>
			</Card>
		</>
	);
});
