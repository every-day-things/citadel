import { Link } from "@tanstack/react-router";
import DOMPurify from "dompurify";
import { useCallback, useEffect, useMemo, useState } from "react";
import type { Identifier, LibraryBook, LocalFile } from "@/bindings";
import {
	Button,
	Checkbox,
	Drawer,
	IconButton,
	SearchField,
	Select,
} from "@/components/ui";
import { safeAsyncEventHandler } from "@/lib/async";
import { usePlatform } from "@/lib/platform/context";
import { useBooks, useBooksLoading } from "@/stores/library/store";
import {
	LibraryBookSortOrder,
	type LibraryBookSortOrderKey,
	useLibraryView,
} from "@/stores/library-view/store";
import { BookCover } from "../atoms/BookCover";
import { F7Pencil } from "../icons/F7Pencil";
import { TablerCopy } from "../icons/TablerCopy";
import { BookGrid } from "../molecules/BookGrid";
import styles from "./Books.module.css";

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

	const [isBookSidebarOpen, setIsBookSidebarOpen] = useState(false);

	const [selectedSidebarBook, setSelectedSidebarBook] =
		useState<LibraryBook | null>(null);
	const onBookOpen = useCallback(
		(bookId: LibraryBook["id"]) => {
			const book = books.filter((book) => book.id === bookId).at(0);
			if (!book) return;
			setSelectedSidebarBook(book);
			setIsBookSidebarOpen(true);
		},
		[books],
	);

	return (
		<div className={styles.page}>
			{/*
			 * Finder-style scope bar: pinned to the top of the scroll container
			 * (the panel div wrapping <Outlet/> in __root), above the content.
			 */}
			<div className={styles.scopeBar}>
				<span className={styles.searchWrap}>
					<SearchField
						placeholder="Search"
						aria-label="Search book titles and authors"
						value={query}
						onChange={(event) => setQuery(event.currentTarget.value)}
						className={styles.searchInput}
					/>
				</span>
				<Select
					width={150}
					aria-label="Sort order"
					options={(
						Object.keys(LibraryBookSortOrder) as LibraryBookSortOrderKey[]
					).map((key) => ({
						value: key,
						label: SORT_LABELS[key],
					}))}
					value={sortOrder}
					onChange={(value) => setSortOrder(value as LibraryBookSortOrderKey)}
				/>
				<Checkbox
					label="Unread only"
					checked={hideRead}
					onCheckedChange={setHideRead}
				/>
			</div>
			<div className={styles.gridArea}>
				<BookGrid
					bookList={sortedBooks}
					loading={loading}
					onBookOpen={onBookOpen}
				/>
			</div>
			<div className={styles.footer}>
				<span className={styles.footerText}>
					{sortedBooks.length === books.length
						? `${books.length} books`
						: `${sortedBooks.length} of ${books.length} books`}
				</span>
			</div>
			<Drawer
				open={isBookSidebarOpen}
				onOpenChange={(open) => {
					if (!open) setIsBookSidebarOpen(false);
				}}
				width={440}
			>
				{selectedSidebarBook && <BookDetails book={selectedSidebarBook} />}
			</Drawer>
		</div>
	);
};

const BookDetails = ({ book }: { book: LibraryBook }) => {
	const platform = usePlatform();
	return (
		<div className={styles.details}>
			<div className={styles.detailsTop}>
				<BookCover book={book} disableFade />
				<div className={styles.detailsInfo}>
					<div className={styles.detailsHeading}>
						<span className={styles.detailsTitle}>{book.title}</span>
						<span className={styles.detailsAuthors}>
							{book.author_list.map((author) => author.name).join(", ")}
						</span>
					</div>
					<div className={styles.detailsActions}>
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
					</div>
				</div>
			</div>
			{book.description !== null && book.description.length > 0 && (
				<>
					<hr className={styles.divider} />
					<div className={styles.detailsBlock}>
						<span className={styles.blockTitle}>Description</span>
						{/* We're using DOMPurify to sanitize the HTML before rendering */}
						<div
							className="description-html"
							// biome-ignore lint/security/noDangerouslySetInnerHtml: We sanitize with DOMPurify
							dangerouslySetInnerHTML={{
								__html: DOMPurify.sanitize(book.description),
							}}
						/>
					</div>
				</>
			)}
			<hr className={styles.divider} />
			<div className={styles.metaStack}>
				{book.tag_list.length > 0 && (
					<div className={styles.metaBlock}>
						<span className={styles.blockTitleSm}>Tags</span>
						<div className={styles.tagRow}>
							{book.tag_list.map((tag) => (
								<span key={tag} className={styles.tagBadge}>
									{tag}
								</span>
							))}
						</div>
					</div>
				)}
				{book.identifier_list.length > 0 && (
					<BookIdentifiers identifier_list={book.identifier_list} />
				)}
				<span className={styles.blockTitle}>Formats</span>
				<p className={styles.formatRow}>
					{book.file_list
						.filter((item): item is { Local: LocalFile } => "Local" in item)
						.map((f1) =>
							platform.capabilities.canRevealInFileManager ? (
								<span
									key={f1.Local.path}
									className={`${styles.formatChip} ${styles.formatChipLink}`}
									onPointerDown={safeAsyncEventHandler(async () => {
										await platform.fileOpener.revealInFileManager(
											f1.Local.path,
										);
									})}
								>
									{f1.Local.mime_type} ↗
								</span>
							) : (
								<span key={f1.Local.path} className={styles.formatChip}>
									{f1.Local.mime_type}
								</span>
							),
						)}
				</p>
			</div>
		</div>
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
		<div className={styles.metaBlock}>
			<span className={styles.blockTitleSm}>Identifiers</span>
			<ul className={styles.identifierList}>
				{identifier_list.map(({ label, value }) => {
					if (isKnownLabel(label)) {
						const transformValueToUrl = KNOWN_LABELS_TO_SEARCH_URLS[label];
						const url = transformValueToUrl(value);

						return (
							<li key={label}>
								<span className={styles.identifierEntry}>
									<span className={styles.identifierLabel}>
										{label.toUpperCase()}
									</span>
									:{" "}
									<a
										href={url}
										target="_blank"
										rel={"noreferrer"}
										className={styles.identifierLink}
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
											<TablerCopy style={{ width: "12px" }} />
										</IconButton>
									)}
								</span>
							</li>
						);
					}
					return (
						<li key={label}>
							<span className={styles.identifierEntry}>
								<span className={styles.identifierLabel}>
									{label.toUpperCase()}
								</span>
								: {value}
							</span>
						</li>
					);
				})}
			</ul>
		</div>
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
