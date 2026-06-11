import { shortenToChars } from "$lib/domain/book";
import type { LibraryBook } from "@/bindings";
import { AspectRatio, Overlay, Text, Transition } from "@mantine/core";
import { type HTMLAttributes, useState } from "react";
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

const spineBackground = `
  var(--ctd-cover-spine-bg)
`;

/**
 * Cap on a fluid cover's height (the grid's "shelf" height). Real covers keep
 * their aspect ratio inside a box of `100% of the cell × FLUID_MAX_HEIGHT`.
 */
const FLUID_MAX_HEIGHT_PX = 230;
// Placeholder art keeps the classic 133:200 book proportions.
const PLACEHOLDER_RATIO = 133 / 200;

const BookCoverUsingImage = ({
	book,
	disableFade,
	fluid,
	...props
}: {
	book: LibraryBookWithCoverImage;
	disableFade: boolean;
	fluid: boolean;
} & HTMLAttributes<HTMLDivElement>) => {
	const [isHovering, setIsHovering] = useState(false);
	return (
		<div
			style={{
				// In fluid mode the wrapper shrink-wraps the constrained image
				// so the radius/shadow/spine hug the cover exactly.
				...(fluid
					? { display: "inline-block", maxWidth: "100%" }
					: { width: "133px" }),
				position: "relative",
				borderRadius: "4px",
				overflow: "hidden",
				transition: "transform 180ms ease, box-shadow 180ms ease",
				boxShadow: "var(--ctd-cover-shadow)",
				transform: isHovering ? "translateY(-2px)" : "translateY(0px)",
			}}
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
					...(fluid
						? {
								// Fit inside the cell width and the shelf-height cap,
								// preserving the real cover's aspect ratio (no crop,
								// no stretch).
								maxWidth: "100%",
								maxHeight: `${FLUID_MAX_HEIGHT_PX}px`,
								width: "auto",
								height: "auto",
							}
						: { width: "133px", height: "auto" }),
					display: "block",
				}}
			/>
			<div
				style={{
					position: "absolute",
					inset: 0,
					background: spineBackground,
					pointerEvents: "none",
					zIndex: 1,
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
						color="var(--ctd-cover-overlay)"
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
	fluid,
	...props
}: {
	book: LibraryBook;
	disableFade: boolean;
	fluid: boolean;
} & HTMLAttributes<HTMLDivElement>) => {
	const [isHovering, setIsHovering] = useState(false);

	const imgUrl = selectByStringHash(
		[img1Url, img2Url, img3Url, img4Url, img5Url],
		book.title,
	);

	return (
		<AspectRatio
			ratio={fluid ? PLACEHOLDER_RATIO : 9 / 6}
			h={fluid ? undefined : 200}
			w={fluid ? "100%" : 133}
			// Same box as real covers: the 133:200 ratio turns the height cap
			// into a width cap.
			maw={
				fluid ? `${FLUID_MAX_HEIGHT_PX * PLACEHOLDER_RATIO}px` : undefined
			}
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
					width: fluid ? "100%" : "133px",
					height: fluid ? "100%" : "200px",
					display: "grid",
					gridTemplateAreas: "overlap",
					borderRadius: "4px",
					overflow: "hidden",
					transition: "transform 180ms ease, box-shadow 180ms ease",
					boxShadow: "var(--ctd-cover-shadow)",
					transform: isHovering ? "translateY(-2px)" : "translateY(0px)",
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
						padding: "0.3rem 0.3rem 0.3rem calc(0.3rem + 6px)",
						zIndex: 1,
					}}
				>
					<Text
						size="lg"
						fw="bolder"
						c="var(--ctd-cover-title)"
						style={{
							fontFamily:
								'"Iowan Old Style", "Palatino Linotype", "Book Antiqua", Georgia, serif',
							letterSpacing: "0.01em",
							lineHeight: 1.15,
							textShadow: "var(--ctd-cover-title-shadow)",
						}}
					>
						{shortenToChars(book.title, 36)}
					</Text>
					<Text
						size="sm"
						c="var(--ctd-cover-author)"
						style={{
							textShadow: "var(--ctd-cover-author-shadow)",
							lineHeight: 1.2,
						}}
					>
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
								color="var(--ctd-cover-overlay)"
								backgroundOpacity={0.8}
								zIndex={2}
							/>
						)}
					</Transition>
				</div>
				<div
					style={{
						gridArea: "overlap",
						width: fluid ? "100%" : "133px",
						height: fluid ? "100%" : "200px",
						background: spineBackground,
						pointerEvents: "none",
						zIndex: 2,
					}}
				/>
			</div>
		</AspectRatio>
	);
};

export const BookCover = ({
	book,
	disableFade = false,
	fluid = false,
	...props
}: {
	book: LibraryBook;
	disableFade?: boolean;
	/**
	 * Size to the parent (width ≤ 100%, height ≤ ~230px, aspect ratio kept)
	 * instead of the fixed 133px column used in the details drawer.
	 */
	fluid?: boolean;
} & HTMLAttributes<HTMLDivElement>) => {
	if (book.cover_image?.url !== undefined) {
		return (
			<BookCoverUsingImage
				// @ts-expect-error `cover_image` obviously exists
				book={book}
				disableFade={disableFade}
				fluid={fluid}
				{...props}
			/>
		);
	}

	return (
		<BookCoverWithPlaceholder
			book={book}
			disableFade={disableFade}
			fluid={fluid}
			{...props}
		/>
	);
};
