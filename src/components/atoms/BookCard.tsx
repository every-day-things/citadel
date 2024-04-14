import React, { useCallback } from "react";
import { LibraryBook } from "@/bindings";
import { Card, Center, Image } from "@mantine/core";
import { shortenToChars } from "./BookAsCover";
import styles from "./BookCard.module.css";

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
						{book.cover_image?.url ? (
							<Image
								h={200}
								w="auto"
								fit="contain"
								src={book.cover_image?.url}
								alt={book.title}
								onPointerDown={onCoverTouch}
							/>
						) : (
							<div
								className={styles.coverPlaceholder}
								onPointerDown={onCoverTouch}
								style={{
									backgroundColor: `#${Math.floor(
										Math.random() * 16777215,
									).toString(16)}`,
								}}
							>
								{shortenToChars(book.title, 50)}
							</div>
						)}
					</Center>
				</Card.Section>
			</Card>
		</>
	);
});
