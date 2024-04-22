import { LibraryBook } from "@/bindings";
import { Image } from "@mantine/core";
import { HTMLAttributes } from "react";
import { shortenToChars } from "./BookAsCover";
import styles from "./BookCover.module.css";

export const BookCover = ({
	book,
	...props
}: { book: LibraryBook } & HTMLAttributes<HTMLDivElement>) => {
	if (book.cover_image?.url !== undefined) {
		return (
			<Image
				h={200}
				w="auto"
				fit="contain"
				src={book.cover_image.url}
				alt={book.title}
				{...props}
			/>
		);
	}

	return (
		<div
			className={styles.coverPlaceholder}
			{...props}
			style={{
				backgroundColor: `#${Math.floor(Math.random() * 16777215).toString(
					16,
				)}`,
			}}
		>
			{shortenToChars(book.title, 50)}
		</div>
	);
};
