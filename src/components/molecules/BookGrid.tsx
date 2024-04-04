import { BookView } from "@/BookView";
import { LibraryBook } from "@/bindings";
import { useBreakpoint } from "@/lib/hooks/use-breakpoint";
import { Flex } from "@mantine/core";
import { DataTable } from "mantine-datatable";
import { useMemo } from "react";
import { BookCard } from "../atoms/BookCard";

const groupBySize = <T,>(groupSize: number, array: T[]) => {
	const groups: T[][] = [];
	for (let i = 0; i < array.length; i += groupSize) {
		groups.push(array.slice(i, i + groupSize));
	}
	return groups;
};

/**
 * A horizontal row of book cards, evenly spaced out so that all books are in
 * the same spots.
 * @param param0
 * @returns
 */
const BookGridRow = ({
	books,
	onBookOpen,
}: {
	books: LibraryBook[];
	onBookOpen: (bookId: LibraryBook["id"]) => void;
}) => {
	return (
		<Flex w={"100%"}>
			{books.map((book) => (
				<BookCard key={book.id} book={book} onBookOpen={onBookOpen} />
			))}
		</Flex>
	);
};

/**
 * Returns a group size based on the current breakpoint.
 *
 * @param isMid Mid-sized breakpoint, e.g. sm or md
 * @param isBig A big breakpoint, e.g. lg
 * @returns
 */
const groupSize = (isMid: boolean, isBig: boolean) => {
	if (isBig) {
		return 4;
	}
	if (isMid) {
		return 3;
	}
	return 2;
};

const BookGridPure = ({
	loading,
	bookList: books,
	onBookOpen,
}: {
	loading: boolean;
	bookList: LibraryBook[];
	onBookOpen: BookView["onBookOpen"];
}) => {
	const isAtLeastMd = useBreakpoint("md") ?? true;
	const isAtLeastLg = useBreakpoint("lg") ?? false;

	const groups = useMemo(
		() =>
			groupBySize(groupSize(isAtLeastMd, isAtLeastLg), books).map((books) => ({
				books,
				lastBookId: books.at(-1)?.id,
			})),
		[isAtLeastMd, isAtLeastLg, books],
	);

	return (
		<DataTable
			noHeader
			borderColor="transparent"
			fetching={loading}
			records={groups}
			columns={[
				{
					accessor: "lastBookId",
					title: "Cover",
					render: ({ books }) => (
						<BookGridRow books={books} onBookOpen={onBookOpen} />
					),
				},
			]}
		/>
	);
};

export const BookGrid = ({ loading, bookList, onBookOpen }: BookView) => {
	return (
		<BookGridPure
			loading={loading}
			bookList={bookList}
			onBookOpen={onBookOpen}
		/>
	);
};
