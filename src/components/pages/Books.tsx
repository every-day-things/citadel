import { useBreakpoint } from "@/lib/hooks/use-breakpoint";
import {
	Button,
	Center,
	Divider,
	Drawer,
	Flex,
	Group,
	Image,
	SegmentedControl,
	Select,
	Stack,
	Text,
	TextInput,
} from "@mantine/core";
import { F7SquareGrid2x2 } from "../icons/F7SquareGrid2x2";
import { UseFormReturnType, useForm } from "@mantine/form";
import { useState, useEffect, useMemo, useCallback } from "react";

import { LibraryBook } from "@/bindings";
import { F7ListBullet } from "../icons/F7ListBullet";
import { BookGrid } from "../molecules/BookGrid";
import { BookTable } from "../molecules/BookTable";
import { useLibrary, LibraryState } from "@/lib/contexts/library";
import { useDisclosure } from "@mantine/hooks";
import { BookCover } from "../atoms/BookCover";

const useLoadBooks = () => {
	const [loading, setLoading] = useState(true);
	const [books, setBooks] = useState<LibraryBook[]>([]);
	const { library, state } = useLibrary();

	useEffect(() => {
		void (async () => {
			if (state !== LibraryState.ready) {
				return;
			}

			const books = await library.listBooks();
			setBooks(books);
			setLoading(false);
		})();
	}, [library, state]);

	return [loading, books] as const;
};

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
}: { form: BookViewForm; bookCount: number }) {
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
			<Stack>
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
				<Group>
					<p></p>
				</Group>
				<Divider />
				<Stack>
					<p>
						<span>ISBN</span>: <span>14987234908</span>
					</p>
				</Stack>
			</Stack>
		</>
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
	});

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
			<Button onClick={openBookSidebar}>open drawer</Button>
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
				size={"lg"}
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
