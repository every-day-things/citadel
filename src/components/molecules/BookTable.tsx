import { Box } from "@mantine/core";
import { DataTable } from "mantine-datatable";
import { LibraryBook } from "../../bindings";
import { useState, useEffect, useMemo } from "react";
import { libraryClient } from "@/stores/library";

const showNotification = (props: unknown) => {
	console.log(props);
};

const useLoadBooks = () => {
	const [loading, setLoading] = useState(true);
	const [books, setBooks] = useState<LibraryBook[]>([]);

	useEffect(() => {
		void (async () => {
			const books = await libraryClient().listBooks();
			setBooks(books);
			setLoading(false);
		})();
	}, []);
	return [loading, books] as const;
};

const BookTablePure = ({
	loading,
	books,
}: { loading: boolean; books: LibraryBook[] }) => {
	return (
		<DataTable
			withTableBorder
			borderRadius="sm"
			withColumnBorders
			striped
			highlightOnHover
			fetching={loading}
			records={books}
			columns={[
				{
					accessor: "id",
					// this column has a custom title
					title: "#",
					// right-align column
					textAlign: "right",
					width: 50,
				},
				{ accessor: "title" },
				{
					accessor: "author_list",
					// this column has custom cell data rendering
					render: ({ author_list }) => (
						<Box>
							{author_list.map((item) => item.name).join(", ")}
						</Box>
					),
				}
			]}
			// execute this callback when a row is clicked
			onRowClick={({ record: { author_list, title } }) =>
				showNotification({
					title: `Clicked on ${title}`,
					message: `You clicked on ${title}, a book written by ${author_list.join(
						", ",
					)}`,
					withBorder: true,
				})
			}
		/>
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

export const BookTable = ({ options }: { options: BookViewOptions }) => {
	const [loading, books] = useLoadBooks();

	const filteredBooks = useMemo(
		() => filterBooksByQuery(books, options.searchQuery),
		[books, options.searchQuery],
	);

	const sortedBooks = useMemo(() => {
		const compare = (a: LibraryBook, b: LibraryBook) => {
			switch (options.sortOrder) {
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
	}, [filteredBooks, options.sortOrder]);

	return <BookTablePure loading={loading} books={sortedBooks} />;
};
