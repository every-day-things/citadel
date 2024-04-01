import { LibraryBook } from "@/bindings";
import { Card, Center, Image } from "@mantine/core";
import React from "react";
import { shortenToChars } from "./BookAsCover";
import styles from "./BookCard.module.css";

export const BookCard = React.memo(function BookCard({
	book,
}: {
	book: LibraryBook;
}) {
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
							/>
						) : (
							<div
								className={styles.coverPlaceholder}
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
