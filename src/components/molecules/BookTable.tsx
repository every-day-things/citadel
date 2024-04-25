import { BookView } from "@/BookView";
import { formatAuthorList } from "@/lib/authors";
import { Box } from "@mantine/core";
import { DataTable } from "mantine-datatable";
import { LibraryBook } from "../../bindings";

export const BookTable = ({ loading, bookList }: BookView) => {
	return <BookTablePure loading={loading} bookList={bookList} />;
};

const BookTablePure = ({
	loading,
	bookList: books,
}: {
	loading: boolean;
	bookList: LibraryBook[];
}) => {
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
					title: "Cover",
					render: ({ cover_image }) => {
						return (
							<Box
								style={{
									backgroundImage: `url(${cover_image?.url})`,
									backgroundSize: "contain",
									backgroundPosition: "center",
									backgroundRepeat: "no-repeat",
									maxWidth: "220px",
									width: "220px",
									height: "220px",
									boxSizing: "border-box",
									padding: "0",
									margin: "0",
								}}
							/>
						);
					},
				},
				{ accessor: "title" },
				{
					accessor: "author_list",
					title: "Authors",
					// this column has custom cell data rendering
					render: ({ author_list }) => (
						<Box>{formatAuthorList(author_list)}</Box>
					),
				},
			]}
		/>
	);
};
