import { BookView } from "@/BookView";
import { LibraryBook } from "@/bindings";
import { useBreakpoint } from "@/lib/hooks/use-breakpoint";
import { Flex } from "@mantine/core";
import { DataTable } from "mantine-datatable";
import { createContext, useContext, useMemo } from "react";
import { BookCard } from "../atoms/BookCard";
import { randomId } from "@mantine/hooks";

export const BookGrid = ({ loading, bookList, onBookOpen }: BookView) => {
	const actionsContext = useMemo(() => {
		return {
			onViewBook: onBookOpen,
		};
	}, [onBookOpen]);

	return (
		<bookActionsContext.Provider value={actionsContext}>
			<BookGridPure loading={loading} bookList={bookList} />
		</bookActionsContext.Provider>
	);
};

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
const BookGridRow = ({ books }: { books: LibraryBook[] }) => {
	const actions = useContext(bookActionsContext);

	return (
		<Flex w={"100%"} key={"a"}>
			{books.map((book) => (
				<BookCard key={book.id} book={book} actions={actions} />
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

/**
 * Wraps an object in an object that has an `id` field with a random `id`, and
 * a `key` field with the value `value`.
 *
 * Useful for rendering data in Mantine DataTables, which use an `id` key to
 * identify each unique row during rendering (by default).
 *
 * @param value
 * @param key
 * @returns
 */
const wrapWithId = <T,>(value: T): { value: T; id: string } => {
	return {
		value,
		id: randomId(),
	};
};

const BookGridPure = ({
	loading,
	bookList: books,
}: {
	loading: boolean;
	bookList: LibraryBook[];
}) => {
	const isAtLeastMd = useBreakpoint("md") ?? true;
	const isAtLeastLg = useBreakpoint("lg") ?? false;

	const groups = useMemo(
		() =>
			groupBySize(groupSize(isAtLeastMd, isAtLeastLg), books)
				.map((books) => ({
					books,
					lastBookId: books.at(-1)?.id,
				}))
				.map((group) => wrapWithId(group)),
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
					render: ({ value: { books } }) => <BookGridRow books={books} />,
				},
			]}
		/>
	);
};

type BookAction = (bookId: LibraryBook["id"]) => void;
interface BookActionsContext {
	onViewBook: BookAction;
}
const bookActionsContext = createContext<BookActionsContext>(
	null as unknown as BookActionsContext,
);
