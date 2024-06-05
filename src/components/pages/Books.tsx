import { Identifier, LibraryBook, LocalFile } from "@/bindings";
import { safeAsyncEventHandler } from "@/lib/async";
import { LibraryState, useLibrary } from "@/lib/contexts/library";
import { useBreakpoint } from "@/lib/hooks/use-breakpoint";
import {
	ActionIcon,
	Button,
	Center,
	Divider,
	Drawer,
	Flex,
	Group,
	SegmentedControl,
	Select,
	Stack,
	Text,
	TextInput,
	rem,
} from "@mantine/core";
import { UseFormReturnType, useForm } from "@mantine/form";
import { useDisclosure } from "@mantine/hooks";
import { Link } from "@tanstack/react-router";
import { clipboard, path } from "@tauri-apps/api";
import { open } from "@tauri-apps/api/shell";
import { useCallback, useEffect, useMemo, useState } from "react";
import { BookCover } from "../atoms/BookCover";
import { F7ListBullet } from "../icons/F7ListBullet";
import { F7SquareGrid2x2 } from "../icons/F7SquareGrid2x2";
import { BookGrid } from "../molecules/BookGrid";
import { BookTable } from "../molecules/BookTable";
import { TablerCopy } from "../icons/TablerCopy";
import { LibraryEventNames } from "@/lib/contexts/library/context";

export const Books = () => {
	const form = useForm<{
		query: string;
		sortOrder: keyof typeof LibraryBookSortOrder;
		view: "covers" | "list";
	}>({
		initialValues: {
			query: "",
			sortOrder: "authorAz",
			view: "covers",
		},
		onValuesChange: (values) => {
			window.localStorage.setItem(BOOK_FORM_PREFS_KEY, JSON.stringify(values));
		},
	});

	// biome-ignore lint/correctness/useExhaustiveDependencies: This must run EXACTLY once: on mount.
	useEffect(() => {
		const storedValue = window.localStorage.getItem(BOOK_FORM_PREFS_KEY);
		if (storedValue) {
			try {
				// TODO: Actually validate that the stored config is valid
				const savedPreferences: typeof form.values = JSON.parse(
					storedValue,
				) as unknown as typeof form.values;
				form.setValues(savedPreferences);
			} catch (e) {
				console.error("Failed to parse stored value");
			}
		}
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, []);

	const [loading, books] = useLoadBooks();

	const filteredBooks = useMemo(
		() => filterBooksByQuery(books, form.values.query),
		[books, form.values.query],
	);

	const sortedBooks = useMemo(() => {
		const compare = (a: LibraryBook, b: LibraryBook) => {
			switch (form.values.sortOrder) {
				case "authorAz":
					return a.author_list[0].sortable_name.localeCompare(
						b.author_list[0].sortable_name,
					);
				case "authorZa":
					return b.author_list[0].sortable_name.localeCompare(
						a.author_list[0].sortable_name,
					);
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
	}, [filteredBooks, form.values.sortOrder]);

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
		<>
			<Header form={form} bookCount={sortedBooks.length} />
			{form.values.view === "covers" ? (
				<BookGrid
					bookList={sortedBooks}
					loading={loading}
					onBookOpen={onBookOpen}
				/>
			) : (
				<BookTable
					bookList={sortedBooks}
					loading={loading}
					onBookOpen={onBookOpen}
				/>
			)}
			<Drawer
				offset={8}
				size={"md"}
				radius="md"
				opened={isBookSidebarOpen}
				position="right"
				onClose={closeBookSidebar}
				title=""
				overlayProps={{ blur: 3, backgroundOpacity: 0.35 }}
			>
				{selectedSidebarBook && <BookDetails book={selectedSidebarBook} />}
			</Drawer>
		</>
	);
};

const useLoadBooks = () => {
	const [loading, setLoading] = useState(true);
	const [books, setBooks] = useState<LibraryBook[]>([]);
	const { library, state, eventEmitter } = useLibrary();
	const updateBooklist = useCallback(() => {
		setLoading(true);
		void (async () => {
			if (state !== LibraryState.ready) {
				return;
			}

			const books = await library.listBooks();
			setBooks(books);
			setLoading(false);
		})();
	}, [library, state]);

	useEffect(() => {
		updateBooklist();
	}, [updateBooklist]);

	useEffect(() => {
		if (state !== LibraryState.ready) {
			return;
		}

		const unsubNewBook = eventEmitter.listen(LibraryEventNames.LIBRARY_BOOK_CREATED, () => {
			updateBooklist();
		});
		const unsubUpdatedBook = eventEmitter.listen(LibraryEventNames.LIBRARY_BOOK_UPDATED, () => {
			updateBooklist();
		});


		return () => {
			unsubNewBook();
			unsubUpdatedBook();
		};
	}, [state, eventEmitter, updateBooklist]);

	return [loading, books] as const;
};

const BOOK_FORM_PREFS_KEY = "book-form-prefs";

const LibraryBookSortOrder = {
	nameAz: "name-asc",
	nameZa: "name-desc",
	authorAz: "author-asc",
	authorZa: "author-desc",
} as const;

type BookViewForm = UseFormReturnType<{
	query: string;
	sortOrder: keyof typeof LibraryBookSortOrder;
	view: "covers" | "list";
}>;

function FilterControls({ form }: { form: BookViewForm }) {
	const LibraryBookSortOrderStrings: Record<
		keyof typeof LibraryBookSortOrder,
		string
	> = {
		nameAz: "Name (A-Z)",
		nameZa: "Name (Z-A)",
		authorAz: "Author (A-Z)",
		authorZa: "Author (Z-A)",
	} as const;
	const LBSOSEntries: [keyof typeof LibraryBookSortOrder, string][] =
		Object.entries(LibraryBookSortOrder) as [
			keyof typeof LibraryBookSortOrder,
			string,
		][];

	const mdBreakpoint = useBreakpoint("md");
	const viewControls = [
		{
			value: "covers",
			label: (
				<Center style={{ gap: 4 }}>
					<F7SquareGrid2x2 />
					{mdBreakpoint && <span>Covers</span>}
				</Center>
			),
		},
		{
			value: "list",
			label: (
				<Center style={{ gap: 4 }}>
					<F7ListBullet />
					{mdBreakpoint && <span>List</span>}
				</Center>
			),
		},
	];

	return (
		<Flex
			mih={50}
			gap="sm"
			miw={100}
			justify="space-between"
			align="center"
			direction="row"
			wrap="wrap"
		>
			<TextInput
				miw="32ch"
				placeholder="Search book titles and authors"
				{...form.getInputProps("query")}
			/>
			<Select
				placeholder="Sort Order"
				allowDeselect={false}
				w={150}
				data={LBSOSEntries.map(([key]) => ({
					value: key,
					label: LibraryBookSortOrderStrings[key],
				}))}
				{...form.getInputProps("sortOrder")}
			/>

			<SegmentedControl data={viewControls} {...form.getInputProps("view")} />
		</Flex>
	);
}

function Header({
	form,
	bookCount,
}: {
	form: BookViewForm;
	bookCount: number;
}) {
	return (
		<Stack>
			<FilterControls form={form} />
			<p>
				Showing 1-{bookCount} of {bookCount} items
			</p>
		</Stack>
	);
}

const BookDetails = ({ book }: { book: LibraryBook }) => {
	return (
		<>
			<Stack h={"100%"}>
				<Group wrap={"nowrap"} align="flex-start">
					<BookCover book={book} />
					<Stack ml={"sm"} align="flex-start" justify="flex-start">
						<Text size="xl" fw={"700"}>
							{book.title}
						</Text>
						<Text size="md">
							{book.author_list.map((author) => author.name).join(", ")}
						</Text>
					</Stack>
				</Group>
				<Divider />
				<Stack>
					{book.identifier_list.length > 0 && (
						<BookIdentifiers identifier_list={book.identifier_list} />
					)}
					<p>
						<span>Formats</span>:{" "}
						{book.file_list
							.filter((item): item is { Local: LocalFile } => "Local" in item)
							.map((f1) => (
								<span
									key={f1.Local.path}
									style={{ textDecoration: "underline", marginRight: "1rem" }}
									onPointerDown={safeAsyncEventHandler(async () => {
										const directory = await path.dirname(f1.Local.path);

										await open(directory);
									})}
								>
									{f1.Local.mime_type} ↗
								</span>
							))}
					</p>
				</Stack>
				<Stack justify="flex-end" align="flex-end" style={{ flexGrow: 1 }}>
					<Group>
						<Button
							onPointerDown={safeAsyncEventHandler(async () => {
								const firstFile = book.file_list[0];
								if (firstFile === undefined) return;

								const isLocal = "Local" in firstFile;
								if (!isLocal) return;

								await open(firstFile.Local.path);
							})}
						>
							Read
						</Button>
						<Link to={`/books/${book.id}`}>
							<Button>Edit</Button>
						</Link>
					</Group>
				</Stack>
			</Stack>
		</>
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
	return (
		<Stack gap={"xs"}>
			<Text size="xs">IDs</Text>
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
									<a href={url} target="_blank" rel={"noreferrer"}>
										{value}
									</a>
									<ActionIcon
										variant="subtle"
										color="gray"
										onPointerDown={safeAsyncEventHandler(async () => {
											await clipboard.writeText(value);
										})}
									>
										<TablerCopy style={{ width: rem(12) }} />
									</ActionIcon>
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

const filterBooksByQuery = (books: LibraryBook[], query: string) => {
	const lowerQuery = query.toLowerCase();
	return books.filter(
		({ title, author_list }) =>
			title.toLowerCase().includes(lowerQuery) ||
			author_list.some(({ name }) => name.toLowerCase().includes(lowerQuery)),
	);
};
