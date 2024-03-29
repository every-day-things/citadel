import { BookView } from "@/BookView";
import { Box } from "@mantine/core";
import { DataTable } from "mantine-datatable";
import { LibraryBook } from "../../bindings";

const showNotification = (props: unknown) => {
	console.log(props);
};

const BookTablePure = ({
	loading,
	bookList: books,
}: { loading: boolean; bookList: LibraryBook[] }) => {
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


export const BookTable = ({ loading, bookList }: BookView) => {
	return <BookTablePure loading={loading} bookList={bookList} />;
};
