import { useBreakpoint } from "@/lib/hooks/use-breakpoint";
import {
	Center,
	Flex,
	SegmentedControl,
	Select,
	Stack,
	TextInput,
	useMantineTheme,
} from "@mantine/core";
import { F7SquareGrid2x2 } from "../icons/F7SquareGrid2x2";
import { UseFormReturnType, useForm } from "@mantine/form";
import { useState, useEffect, useMemo } from "react";

import { LibraryBook } from "@/bindings";
import { F7ListBullet } from "../icons/F7ListBullet";
import { BookGrid } from "../molecules/BookGrid";
import { BookTable } from "../molecules/BookTable";
import { useLibrary } from "@/lib/contexts/library";

const useLoadBooks = () => {
	const [loading, setLoading] = useState(true);
	const [books, setBooks] = useState<LibraryBook[]>([]);
  const {library, loading: libraryLoading} = useLibrary();

	useEffect(() => {
		void (async () => {
			if (libraryLoading || library === null) return;
			const books = await library.listBooks();
			setBooks(books);
			setLoading(false);
		})();
	}, [library, libraryLoading]);

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

	const theme = useMantineTheme();
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

			<SegmentedControl color={theme.colors.lavender[2]} data={viewControls} {...form.getInputProps("view")} />
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

export const BookView = () => {
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

	return (
		<>
			<Header form={form} bookCount={sortedBooks.length} />
			{form.values.view === "covers" ? (
				<BookGrid bookList={sortedBooks} loading={loading} />
			) : (
				<BookTable bookList={sortedBooks} loading={loading} />
			)}
		</>
	);
};
