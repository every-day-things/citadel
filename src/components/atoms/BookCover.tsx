import { shortenToChars } from "$lib/domain/book";
import { LibraryBook } from "@/bindings";
import { Image, Text } from "@mantine/core";
import { HTMLAttributes } from "react";
import { formatAuthorList } from "@/lib/authors";

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
			{...props}
			style={{
				width: "150px",
				height: "200px",
				background: "linear-gradient(#555, #111)",
				backgroundColor: "#555",
				padding: "0.5rem",
			}}
		>
			<div
				style={{
					border: "2px solid #888",
					height: "100%",
					display: "flex",
					flexDirection: "column",
					alignContent: "center",
					justifyContent: "space-between",
					textAlign: "center",
					padding: "0.5rem",
				}}
			>
				<Text size="sm">{shortenToChars(book.title, 50)}</Text>
				<Text size="sm">{formatAuthorList(book.author_list)}</Text>
			</div>
		</div>
	);
};
