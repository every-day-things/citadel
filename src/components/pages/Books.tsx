import type { Identifier, LibraryBook, LocalFile } from "@/bindings";
import { safeAsyncEventHandler } from "@/lib/async";
import DOMPurify from "dompurify";
import {
	Badge,
	Center,
	Checkbox,
	Divider,
	Drawer,
	Group,
	Select,
	Stack,
	Text,
	TextInput,
	rem,
} from "@mantine/core";
import { Button, IconButton } from "@/components/ui";
import { useDisclosure } from "@mantine/hooks";
import { Link } from "@tanstack/react-router";
import { usePlatform } from "@/lib/platform/context";
import { useCallback, useEffect, useMemo, useState } from "react";
import { BookCover } from "../atoms/BookCover";
import { BookGrid } from "../molecules/BookGrid";
import { TablerCopy } from "../icons/TablerCopy";
import { F7Pencil } from "../icons/F7Pencil";
import { useBooks, useBooksLoading } from "@/stores/library/store";
import {
	LibraryBookSortOrder,
	type LibraryBookSortOrderKey,
	useLibraryView,
} from "@/stores/library-view/store";

interface BookSearchOptions {
	search_for_author?: string;
}

const SORT_LABELS: Record<LibraryBookSortOrderKey, string> = {
	nameAz: "Name (A–Z)",
	nameZa: "Name (Z–A)",
	authorAz: "Author (A–Z)",
	authorZa: "Author (Z–A)",
};

export const Books = ({ search_for_author }: BookSearchOptions) => {
	const query = useLibraryView((s) => s.query);
	const sortOrder = useLibraryView((s) => s.sortOrder);
	const hideRead = useLibraryView((s) => s.hideRead);
	const setQuery = useLibraryView((s) => s.setQuery);
	const setSortOrder = useLibraryView((s) => s.setSortOrder);
	const setHideRead = useLibraryView((s) => s.setHideRead);

	// biome-ignore lint/correctness/useExhaustiveDependencies: author deep-links override the saved query exactly once, on mount.
	useEffect(() => {
		if (search_for_author) {
			setQuery(search_for_author);
		}
	}, []);

	const books = useBooks();
	const loading = useBooksLoading();

	const filteredBooks = useMemo(
		() => filterBooksByQuery(books, { query, hideRead }),
		[books, query, hideRead],
	);

	const sortedBooks = useMemo(() => {
		const compare = (a: LibraryBook, b: LibraryBook) => {
			const authorA = a.author_list[0]?.sortable_name ?? "";
			const authorB = b.author_list[0]?.sortable_name ?? "";

			switch (sortOrder) {
				case "authorAz":
					return authorA.localeCompare(authorB);
				case "authorZa":
					return authorB.localeCompare(authorA);
				case "nameAz":
					return (a.sortable_title ?? a.title).localeCompare(
						b.sortable_title ?? b.title,
					);
				case "nameZa":
					return (b.sortable_title ?? b.title).localeCompare(
						a.sortable_title ?? a.title,
					);
				default:
					return 0;
			}
		};
		return [...filteredBooks].sort(compare);
	}, [filteredBooks, sortOrder]);

	const [
		isBookSidebarOpen,
		{ open: openBookSidebar, close: closeBookSidebar },
	] = useDisclosure(false);

	const [selectedSidebarBook, setSelectedSidebarBook] =
		useState<LibraryBook | null>(null);
	const onBookOpen = useCallback(
		(bookId: LibraryBook["id"]) => {
			const book = books.filter((book) => book.id === bookId).at(0);
			if (!book) return;
			setSelectedSidebarBook(book);
			openBookSidebar();
		},
		[books, openBookSidebar],
	);

	return (
		<Stack gap={0} mih="100%">
			{/*
			 * Finder-style scope bar: pinned to the top of the scroll container
			 * (the panel div wrapping <Outlet/> in __root), above the content.
			 */}
			<Group
				gap="sm"
				wrap="nowrap"
				style={{
					position: "sticky",
					top: 0,
					zIndex: 3,
					padding: "8px 24px",
					backgroundColor: "var(--ctd-content-bg)",
					borderBottom: "1px solid var(--ctd-border)",
				}}
			>
				<TextInput
					size="xs"
					placeholder="Search"
					aria-label="Search book titles and authors"
					value={query}
					onChange={(event) => setQuery(event.currentTarget.value)}
					style={{ flexGrow: 1, maxWidth: 320 }}
					leftSection={
						<svg
							width="12"
							height="12"
							viewBox="0 0 15 15"
							fill="none"
							aria-hidden="true"
						>
							<circle
								cx="6.5"
								cy="6.5"
								r="4.5"
								stroke="currentColor"
								strokeWidth="1.4"
							/>
							<path
								d="M10 10l3.5 3.5"
								stroke="currentColor"
								strokeWidth="1.4"
								strokeLinecap="round"
							/>
						</svg>
					}
					styles={{
						section: { color: "var(--ctd-ink-soft)" },
					}}
				/>
				<Select
					size="xs"
					w={150}
					allowDeselect={false}
					aria-label="Sort order"
					data={(
						Object.keys(LibraryBookSortOrder) as LibraryBookSortOrderKey[]
					).map((key) => ({
						value: key,
						label: SORT_LABELS[key],
					}))}
					value={sortOrder}
					onChange={(value) =>
						value && setSortOrder(value as LibraryBookSortOrderKey)
					}
					styles={{
						dropdown: {
							backgroundColor: "var(--ctd-surface-strong)",
							borderColor: "var(--ctd-border)",
						},
					}}
				/>
				<Checkbox
					size="xs"
					label="Unread only"
					checked={hideRead}
					onChange={(event) => setHideRead(event.currentTarget.checked)}
					styles={{
						label: { fontSize: 13, color: "var(--ctd-ink)" },
					}}
				/>
			</Group>
			<div style={{ flex: 1 }}>
				<BookGrid
					bookList={sortedBooks}
					loading={loading}
					onBookOpen={onBookOpen}
				/>
			</div>
			<Center
				py={6}
				style={{
					position: "sticky",
					bottom: 0,
					zIndex: 2,
					backgroundColor: "var(--ctd-content-bg)",
					borderTop: "1px solid var(--ctd-border)",
				}}
			>
				<Text size="xs" c="dimmed">
					{sortedBooks.length === books.length
						? `${books.length} books`
						: `${sortedBooks.length} of ${books.length} books`}
				</Text>
			</Center>
			<Drawer
				offset={8}
				size={"md"}
				radius="md"
				opened={isBookSidebarOpen}
				position="right"
				onClose={closeBookSidebar}
				title={null}
				withCloseButton={false}
				overlayProps={{ blur: 3, backgroundOpacity: 0.35 }}
				styles={{
					content: {
						background: "var(--ctd-drawer-gradient)",
						border: "1px solid var(--ctd-border)",
					},
					header: {
						background: "transparent",
						padding: 0,
						minHeight: 0,
					},
					body: {
						paddingTop: "0.4rem",
					},
				}}
			>
				{selectedSidebarBook && <BookDetails book={selectedSidebarBook} />}
			</Drawer>
		</Stack>
	);
};

const BookDetails = ({ book }: { book: LibraryBook }) => {
	const platform = usePlatform();
	return (
		<Stack h={"100%"} gap="md">
			<Group wrap={"nowrap"} align="flex-start">
				<BookCover book={book} disableFade />
				<Stack justify="space-between" mih={"200px"} maw="calc(400px - 133px)">
					<Stack ml={"sm"} align="flex-start" justify="flex-start" gap={4}>
						<Text size="xl" fw={"700"} style={{ lineHeight: 1.15 }}>
							{book.title}
						</Text>
						<Text size="md" c="dimmed">
							{book.author_list.map((author) => author.name).join(", ")}
						</Text>
					</Stack>
					<Group justify="space-between" w={"100%"}>
						{platform.capabilities.canOpenLocalPaths && (
							<Button
								variant="subtle"
								onPointerDown={safeAsyncEventHandler(async () => {
									const firstFile = book.file_list[0];
									if (firstFile === undefined) return;

									const isLocal = "Local" in firstFile;
									if (!isLocal) return;

									await platform.fileOpener.openPath(firstFile.Local.path);
								})}
							>
								Read
							</Button>
						)}
						<Link to={`/books/${book.id}`}>
							<Button variant="primary">
								<F7Pencil />
								Edit
							</Button>
						</Link>
					</Group>
				</Stack>
			</Group>
			{book.description !== null && book.description.length > 0 && (
				<>
					<Divider />
					<Stack>
						<Text fw={700} style={{}}>
							Description
						</Text>
						{/* We're using DOMPurify to sanitize the HTML before rendering */}
						<div
							className="description-html"
							// biome-ignore lint/security/noDangerouslySetInnerHtml: We sanitize with DOMPurify
							dangerouslySetInnerHTML={{
								__html: DOMPurify.sanitize(book.description),
							}}
						/>
					</Stack>
				</>
			)}
			<Divider />
			<Stack gap={6}>
				{book.tag_list.length > 0 && (
					<Stack gap="xs">
						<Text size="sm" fw={700} style={{}}>
							Tags
						</Text>
						<Group gap="xs">
							{book.tag_list.map((tag) => (
								<Badge key={tag} variant="light" color="accent">
									{tag}
								</Badge>
							))}
						</Group>
					</Stack>
				)}
				{book.identifier_list.length > 0 && (
					<BookIdentifiers identifier_list={book.identifier_list} />
				)}
				<Text fw={700} style={{}}>
					Formats
				</Text>
				<p style={{ marginTop: 0 }}>
					{book.file_list
						.filter((item): item is { Local: LocalFile } => "Local" in item)
						.map((f1) =>
							platform.capabilities.canRevealInFileManager ? (
								<span
									key={f1.Local.path}
									style={{
										display: "inline-flex",
										textDecoration: "underline",
										marginRight: "0.75rem",
										fontSize: "0.9rem",
									}}
									onPointerDown={safeAsyncEventHandler(async () => {
										await platform.fileOpener.revealInFileManager(
											f1.Local.path,
										);
									})}
								>
									{f1.Local.mime_type} ↗
								</span>
							) : (
								<span
									key={f1.Local.path}
									style={{
										display: "inline-flex",
										marginRight: "0.75rem",
										fontSize: "0.9rem",
									}}
								>
									{f1.Local.mime_type}
								</span>
							),
						)}
				</p>
			</Stack>
		</Stack>
	);
};

const KNOWN_LABELS_TO_SEARCH_URLS = {
	amazon: (value: string) => `https://www.amazon.com/dp/${value}`,
	asin: (value: string) => `https://www.amazon.com/dp/${value}`,
	goodreads: (value: string) => `https://www.goodreads.com/book/show/${value}`,
	google: (value: string) => `https://books.google.com/books?id=${value}`,
	isbn: (value: string) =>
		`https://en.wikipedia.org/wiki/Special:BookSources?isbn=${value}`,
	"mobi-asin": (value: string) => `https://www.amazon.com/dp/${value}`,
	uri: (value: string) => value,
	url: (value: string) => value,
} as const;

const isKnownLabel = (
	label: string,
): label is keyof typeof KNOWN_LABELS_TO_SEARCH_URLS =>
	label in KNOWN_LABELS_TO_SEARCH_URLS;

const BookIdentifiers = ({
	identifier_list,
}: {
	identifier_list: Identifier[];
}) => {
	const platform = usePlatform();
	return (
		<Stack gap={"xs"}>
			<Text size="sm" fw={700} style={{}}>
				Identifiers
			</Text>
			<ul style={{ listStyle: "none", padding: 0, margin: 0 }}>
				{identifier_list.map(({ label, value }) => {
					if (isKnownLabel(label)) {
						const transformValueToUrl = KNOWN_LABELS_TO_SEARCH_URLS[label];
						const url = transformValueToUrl(value);

						return (
							<li key={label}>
								<Text
									size="sm"
									component="span"
									style={{ marginRight: "1rem" }}
								>
									<Text size="sm" component="span" fw="bold">
										{label.toUpperCase()}
									</Text>
									:{" "}
									<a
										href={url}
										target="_blank"
										rel={"noreferrer"}
										style={{ color: "var(--ctd-link)" }}
									>
										{value}
									</a>
									{platform.capabilities.canCopyToClipboard && (
										<IconButton
											aria-label="Copy identifier"
											onPointerDown={safeAsyncEventHandler(async () => {
												await platform.clipboard.writeText(value);
											})}
										>
											<TablerCopy style={{ width: rem(12) }} />
										</IconButton>
									)}
								</Text>
							</li>
						);
					}
					return (
						<li key={label}>
							<Text component="span" style={{ marginRight: "1rem" }}>
								<Text component="span" fw="bold">
									{label.toUpperCase()}
								</Text>
								: {value}
							</Text>
						</li>
					);
				})}
			</ul>
		</Stack>
	);
};

export interface BookViewOptions {
	sortOrder: "authorAz" | "authorZa" | "nameAz" | "nameZa";
	searchQuery: string;
}

const filterBooksByQuery = (
	books: LibraryBook[],
	{ query, hideRead }: { query: string; hideRead: boolean },
) => {
	const lowerQuery = query.toLowerCase();
	return books
		.filter(
			({ title, author_list }) =>
				title.toLowerCase().includes(lowerQuery) ||
				author_list.some(({ name }) => name.toLowerCase().includes(lowerQuery)),
		)
		.filter((book) => (hideRead ? !book.is_read : true));
};
