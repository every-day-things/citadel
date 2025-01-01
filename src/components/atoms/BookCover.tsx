import { shortenToChars } from "$lib/domain/book";
import { LibraryBook } from "@/bindings";
import { AspectRatio, Overlay, Text, Transition } from "@mantine/core";
import { HTMLAttributes, useEffect, useState } from "react";
import { formatAuthorList } from "@/lib/authors";
import { selectByStringHash } from "@/lib/hash-string";

import img1Url from "../../assets/1.jpg";
import img2Url from "../../assets/2.jpg";
import img3Url from "../../assets/3.jpg";
import img4Url from "../../assets/4.jpg";
import img5Url from "../../assets/5.jpg";

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

	const imgUrl = selectByStringHash(
		[img1Url, img2Url, img3Url, img4Url, img5Url],
		book.title,
	);

	return (
		<AspectRatio
			ratio={9 / 6}
			h={200}
			w={133}
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
					width: "133px",
					height: "200px",
					display: "grid",
					gridTemplateAreas: "overlap",
				}}
			>
				<img
					alt="App-provided placeholder cover."
					src={imgUrl}
					style={{
						width: "inherit",
						height: "inherit",
						gridArea: "overlap",
						filter: "brightness(0.7)",
					}}
				/>
				<div
					style={{
						height: "100%",
						width: "auto",
						display: "flex",
						flexDirection: "column",
						alignContent: "flex-start",
						justifyContent: "flex-end",
						gridArea: "overlap",
						padding: "0.3rem",
						zIndex: 1,
					}}
				>
					<Text
						size="lg"
						fw="bolder"
						c="white"
						style={{ textShadow: "0px 1px #888" }}
					>
						{shortenToChars(book.title, 45)}
					</Text>
					<Text size="md" c="#ccc" style={{ textShadow: "0px 2px #222" }}>
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
