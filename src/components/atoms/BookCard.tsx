import React, { useCallback } from "react";
import type { LibraryBook } from "@/bindings";
import classes from "./BookCard.module.css";
import { BookCover } from "./BookCover";

type BookAction = (bookId: LibraryBook["id"]) => void;

interface BookActions {
	onViewBook: BookAction;
}

interface BookCardProps {
	book: LibraryBook;
	actions: BookActions;
}

export const BookCard = React.memo(function BookCard({
	book,
	actions: { onViewBook },
}: BookCardProps) {
	const onCoverTouch = useCallback(() => {
		onViewBook(book.id);
	}, [onViewBook, book]);

	return (
		<div className={classes.cell}>
			<BookCover book={book} fluid onPointerDown={onCoverTouch} />
		</div>
	);
});
