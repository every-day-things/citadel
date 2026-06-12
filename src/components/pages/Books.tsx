import { Link, useNavigate } from "@tanstack/react-router";
import DOMPurify from "dompurify";
import {
	Fragment,
	useCallback,
	useEffect,
	useMemo,
	useRef,
	useState,
} from "react";
import type { Identifier, LibraryBook, LocalFile } from "@/bindings";
import {
	Button,
	Checkbox,
	Drawer,
	IconButton,
	SearchField,
	Select,
	Sheet,
	TextInput,
	Tooltip,
} from "@/components/ui";
import { safeAsyncEventHandler } from "@/lib/async";
import { useLibraryKeymap } from "@/lib/hooks/use-library-keymap";
import { usePlatform } from "@/lib/platform/context";
import { formatSeriesIndex } from "@/lib/series";
import { useBooks, useBooksLoading } from "@/stores/library/store";
import {
	LibraryBookSortOrder,
	type LibraryBookSortOrderKey,
	useLibraryView,
} from "@/stores/library-view/store";
import { createSmartShelf } from "@/stores/settings/actions";
import { BookCover } from "../atoms/BookCover";
import { F7Bookmark } from "../icons/F7Bookmark";
import { F7Pencil } from "../icons/F7Pencil";
import { TablerCopy } from "../icons/TablerCopy";
import { BookGrid } from "../molecules/BookGrid";
import styles from "./Books.module.css";

interface BookSearchOptions {
	search_for_author?: string;
	search_for_series?: string;
}

const SORT_LABELS: Record<LibraryBookSortOrderKey, string> = {
	nameAz: "Name (A–Z)",
	nameZa: "Name (Z–A)",
	authorAz: "Author (A–Z)",
	authorZa: "Author (Z–A)",
};

export const Books = ({
	search_for_author,
	search_for_series,
}: BookSearchOptions) => {
	const query = useLibraryView((s) => s.query);
	const sortOrder = useLibraryView((s) => s.sortOrder);
	const hideRead = useLibraryView((s) => s.hideRead);
	const setQuery = useLibraryView((s) => s.setQuery);
	const setSortOrder = useLibraryView((s) => s.setSortOrder);
	const setHideRead = useLibraryView((s) => s.setHideRead);
	const resetToAllBooks = useLibraryView((s) => s.resetToAllBooks);

	// Author deep-links (Authors page, drawer author names) fill the text
	// query; reacting to the param means in-page clicks work too, while
	// later hand-edits to the query stick.
	useEffect(() => {
		if (search_for_author) {
			setQuery(search_for_author);
		}
	}, [search_for_author, setQuery]);

	// A series link promises "the rest of this series in one click", so a
	// text query from before the click must not keep filtering the results.
	useEffect(() => {
		if (search_for_series) {
			setQuery("");
		}
	}, [search_for_series, setQuery]);

	const books = useBooks();
	const loading = useBooksLoading();

	const navigate = useNavigate();
	const onClearSeriesFilter = useCallback(() => {
		void navigate({ to: "/", search: {} });
	}, [navigate]);

	const filteredBooks = useMemo(() => {
		const queryFiltered = filterBooksByQuery(books, { query, hideRead });
		if (!search_for_series) return queryFiltered;
		return queryFiltered.filter((book) => book.series === search_for_series);
	}, [books, query, hideRead, search_for_series]);

	const sortedBooks = useMemo(() => {
		// An active series filter overrides the user's chosen sort order:
		// books read best in series order.
		if (search_for_series) {
			return [...filteredBooks].sort(compareBySeriesIndex);
		}

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
	}, [filteredBooks, sortOrder, search_for_series]);

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

	const searchInputRef = useRef<HTMLInputElement>(null);
	const gridContainerRef = useRef<HTMLDivElement>(null);

	const { selectedBookId } = useLibraryKeymap({
		books: sortedBooks,
		drawerOpened: isBookSidebarOpen,
		searchInputRef,
		gridContainerRef,
		onBookOpen,
		onClearSearch: () => setQuery(""),
	});

	const noMatches = !loading && sortedBooks.length === 0 && books.length > 0;

	return (
		<div className={styles.page}>
			{/*
			 * Finder-style scope bar: pinned to the top of the scroll container
			 * (the panel div wrapping <Outlet/> in __root), above the content.
			 */}
			<div className={styles.scopeBar}>
				<span className={styles.searchWrap}>
					<SearchField
						ref={searchInputRef}
						placeholder={search_for_series !== undefined ? undefined : "Search"}
						aria-label="Search book titles and authors"
						value={query}
						onChange={(event) => setQuery(event.currentTarget.value)}
						className={styles.searchInput}
						tokens={
							search_for_series !== undefined
								? [
										{
											label: `Series: ${search_for_series}`,
											onRemove: onClearSeriesFilter,
											title:
												"Books are sorted in series order while this filter is active",
										},
									]
								: undefined
						}
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
					disabled={search_for_series !== undefined}
				/>
				<Checkbox
					label="Unread only"
					checked={hideRead}
					onCheckedChange={setHideRead}
				/>
				<SaveAsShelfControl
					query={query}
					sortOrder={sortOrder}
					hideRead={hideRead}
				/>
			</div>
			<div
				ref={gridContainerRef}
				tabIndex={-1}
				style={{ outline: "none" }}
				className={styles.gridArea}
			>
				{noMatches ? (
					<div className={styles.emptyState}>
						<span className={styles.emptyText}>
							No books match these filters.
						</span>
						<Button variant="subtle" onClick={() => resetToAllBooks()}>
							Show all books
						</Button>
					</div>
				) : (
					<BookGrid
						bookList={sortedBooks}
						loading={loading}
						onBookOpen={onBookOpen}
						selectedBookId={selectedBookId}
					/>
				)}
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
				onCloseAutoFocus={(event) => {
					// No Dialog.Trigger to return focus to; hand it to the grid so
					// arrow keys keep working after the drawer closes.
					event.preventDefault();
					gridContainerRef.current?.focus();
				}}
				onOpenAutoFocus={(event) => {
					// Land on the primary action instead of the header close button.
					const target = document.querySelector("[data-drawer-initial-focus]");
					if (target instanceof HTMLElement) {
						event.preventDefault();
						target.focus();
					}
				}}
			>
				{selectedSidebarBook && (
					<BookDetails
						book={selectedSidebarBook}
						onClose={() => setIsBookSidebarOpen(false)}
					/>
				)}
			</Drawer>
		</div>
	);
};

interface SaveAsShelfControlProps {
	query: string;
	sortOrder: LibraryBookSortOrderKey;
	hideRead: boolean;
}

const SaveAsShelfControl = ({
	query,
	sortOrder,
	hideRead,
}: SaveAsShelfControlProps) => {
	const applyShelf = useLibraryView((s) => s.applyShelf);
	const bookmarkButtonRef = useRef<HTMLButtonElement>(null);

	const [isOpen, setIsOpen] = useState(false);
	const [name, setName] = useState("");
	const [error, setError] = useState<string | null>(null);

	const close = () => {
		setIsOpen(false);
		setName("");
		setError(null);
	};

	const summary = [
		query.trim().length > 0 ? `search "${query.trim()}"` : "no search",
		`sorted by ${SORT_LABELS[sortOrder]}`,
		hideRead ? "hiding read books" : "showing read books",
	].join(", ");

	const save = async () => {
		const trimmed = name.trim();
		if (trimmed.length === 0) {
			return;
		}

		try {
			const shelf = await createSmartShelf(trimmed, {
				query,
				sortOrder,
				hideRead,
			});
			applyShelf(shelf);
			close();
		} catch (e) {
			setError(e instanceof Error ? e.message : String(e));
		}
	};

	return (
		<>
			<Tooltip label="Save as shelf…">
				<IconButton
					ref={bookmarkButtonRef}
					aria-label="Save as shelf"
					onClick={() => setIsOpen(true)}
				>
					<F7Bookmark style={{ fontSize: 15 }} />
				</IconButton>
			</Tooltip>
			<Sheet
				open={isOpen}
				onOpenChange={(open) => {
					if (!open) close();
				}}
				title="Save as shelf"
				width={420}
				onCloseAutoFocus={(event) => {
					// The sheet has no Dialog.Trigger; return focus to the bookmark
					// button ourselves.
					event.preventDefault();
					bookmarkButtonRef.current?.focus();
				}}
			>
				<div className={styles.shelfForm}>
					<TextInput
						placeholder="Shelf name"
						aria-label="Shelf name"
						// biome-ignore lint/a11y/noAutofocus: the sheet exists to name the shelf; focus must land in the field.
						autoFocus
						value={name}
						error={error}
						onChange={(event) => {
							setName(event.currentTarget.value);
							setError(null);
						}}
						onKeyDown={(event) => {
							if (event.key === "Enter") {
								void save();
							}
						}}
					/>
					<span className={styles.shelfFormHint}>
						Saves the current filters: {summary}.
					</span>
					<div className={styles.shelfFormActions}>
						<Button variant="default" onClick={close}>
							Cancel
						</Button>
						<Button
							variant="primary"
							onClick={() => void save()}
							disabled={name.trim().length === 0}
						>
							Save
						</Button>
					</div>
				</div>
			</Sheet>
		</>
	);
};

const BookDetails = ({
	book,
	onClose,
}: {
	book: LibraryBook;
	onClose: () => void;
}) => {
	const platform = usePlatform();
	const navigate = useNavigate();
	const canRead = platform.capabilities.canOpenLocalPaths;
	return (
		<div className={styles.details}>
			<div className={styles.detailsTop}>
				<BookCover book={book} disableFade />
				<div className={styles.detailsInfo}>
					<div className={styles.detailsHeading}>
						<span className={styles.detailsTitle}>{book.title}</span>
						<span className={styles.detailsAuthors}>
							{book.author_list.map((author, index) => (
								<Fragment key={author.id}>
									{index > 0 && ", "}
									<Link
										to="/"
										search={{ search_for_author: author.name }}
										onClick={onClose}
										className={styles.detailsLink}
									>
										{author.name}
									</Link>
								</Fragment>
							))}
						</span>
						{book.series !== null && (
							<span className={styles.detailsSeries}>
								{book.series_index !== null
									? `Book ${formatSeriesIndex(book.series_index)} of `
									: "Part of "}
								<Link
									to="/"
									search={{ search_for_series: book.series }}
									onClick={onClose}
									className={styles.detailsLink}
								>
									{book.series}
								</Link>
							</span>
						)}
					</div>
					<div className={styles.detailsActions}>
						{canRead && (
							<Button
								variant="subtle"
								data-drawer-initial-focus=""
								onClick={safeAsyncEventHandler(async () => {
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
						<Button
							variant="primary"
							data-drawer-initial-focus={canRead ? undefined : ""}
							onClick={() =>
								void navigate({
									to: "/books/$bookId",
									params: { bookId: book.id },
								})
							}
						>
							<F7Pencil />
							Edit
						</Button>
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

const compareBySeriesIndex = (a: LibraryBook, b: LibraryBook): number => {
	const indexA = a.series_index ?? Number.POSITIVE_INFINITY;
	const indexB = b.series_index ?? Number.POSITIVE_INFINITY;
	if (indexA !== indexB) return indexA - indexB;
	return a.title.localeCompare(b.title);
};

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
