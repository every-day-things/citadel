import { shortenToChars } from "$lib/domain/book";
import { LibraryBook } from "@/bindings";
import { AspectRatio, Overlay, Text, Transition } from "@mantine/core";
import { HTMLAttributes, useState } from "react";
import { formatAuthorList } from "@/lib/authors";

type LibraryBookWithCoverImage = LibraryBook & {
	cover_image: NonNullable<LibraryBook["cover_image"]>;
};

const BookCoverUsingImage = ({
	book,
	disableFade,
	...props
}: {
	book: LibraryBookWithCoverImage;
	disableFade: boolean;
} & HTMLAttributes<HTMLDivElement>) => {
	const [isHovering, setIsHovering] = useState(false);
	return (
		<div
			style={{ height: "200px", width: "auto", position: "relative" }}
			{...props}
			onPointerOver={() => {
				setIsHovering(true);
			}}
			onPointerLeave={() => {
				setIsHovering(false);
			}}
		>
			<img
				src={book.cover_image.url}
				alt={book.title}
				style={{
					height: "200px",
					width: "auto",
					objectFit: "contain",
				}}
			/>
			<Transition
				transition="fade"
				duration={100}
				mounted={book.is_read && !isHovering && !disableFade}
			>
				{(styles) => (
					<Overlay
						style={styles}
						color="#12161a"
						backgroundOpacity={0.8}
						zIndex={2}
					/>
				)}
			</Transition>
		</div>
	);
};

const BookCoverWithPlaceholder = ({
	book,
	disableFade,
	...props
}: {
	book: LibraryBook;
	disableFade: boolean;
} & HTMLAttributes<HTMLDivElement>) => {
	const [isHovering, setIsHovering] = useState(false);

	return (
		<AspectRatio
			h={200}
			w={150}
			m="xs"
			onPointerOver={() => {
				setIsHovering(true);
			}}
			onPointerLeave={() => {
				setIsHovering(false);
			}}
		>
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
					<Text size="sm" c="white">
						{shortenToChars(book.title, 50)}
					</Text>
					<Text size="sm" c="white">
						{formatAuthorList(book.author_list)}
					</Text>
					<Transition
						transition="fade"
						duration={100}
						mounted={book.is_read && !isHovering && !disableFade}
					>
						{(styles) => (
							<Overlay
								style={styles}
								color="#12161a"
								backgroundOpacity={0.8}
								zIndex={2}
							/>
						)}
					</Transition>
				</div>
			</div>
		</AspectRatio>
	);
};

export const BookCover = ({
	book,
	disableFade = false,
	...props
}: {
	book: LibraryBook;
	disableFade?: boolean;
} & HTMLAttributes<HTMLDivElement>) => {
	if (book.cover_image?.url !== undefined) {
		return (
			// @ts-expect-error `cover_image` obviously exists
			<BookCoverUsingImage book={book} disableFade={disableFade} {...props} />
		);
	}

	return (
		<BookCoverWithPlaceholder
			book={book}
			disableFade={disableFade}
			{...props}
		/>
	);
};
