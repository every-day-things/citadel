import type { BookView } from "@/BookView";
import type { BookFile, LibraryBook, LocalFile } from "@/bindings";
import { formatAuthorList } from "@/lib/authors";
import { Badge, Box, Group, Text } from "@mantine/core";
import { DataTable } from "mantine-datatable";

const isLocalFile = (entry: BookFile): entry is { Local: LocalFile } =>
	"Local" in entry;

export const BookTable = ({ loading, bookList, onBookOpen }: BookView) => {
	return (
		<BookTablePure
			loading={loading}
			bookList={bookList}
			onBookOpen={onBookOpen}
		/>
	);
};

const BookTablePure = ({
	loading,
	bookList: books,
	onBookOpen,
}: {
	loading: boolean;
	bookList: LibraryBook[];
	onBookOpen: (bookId: LibraryBook["id"]) => void;
}) => {
	return (
		<DataTable
			withTableBorder
			borderRadius="sm"
			withColumnBorders
			striped
			highlightOnHover
			minHeight={560}
			fetching={loading}
			records={books}
			styles={{
				table: {
					backgroundColor: "var(--ctd-surface-soft)",
					borderColor: "var(--ctd-border)",
				},
				header: {
					backgroundColor: "var(--ctd-surface-muted)",
				},
			}}
			rowStyle={() => ({
				cursor: "pointer",
			})}
			onRowClick={({ record }) => onBookOpen(record.id)}
			columns={[
				{
					accessor: "id",
					title: "Cover",
					width: 72,
					render: ({ cover_image, title }) => {
						return (
							<Box
								style={{
									backgroundImage: `url(${cover_image?.url})`,
									backgroundSize: "cover",
									backgroundPosition: "center",
									backgroundRepeat: "no-repeat",
									width: "44px",
									height: "64px",
									borderRadius: "4px",
									boxShadow: "var(--ctd-shadow-soft)",
									backgroundColor: "var(--ctd-surface-muted)",
									boxSizing: "border-box",
									padding: "0",
									margin: "0",
								}}
								aria-label={`Cover for ${title}`}
							/>
						);
					},
				},
				{
					accessor: "title",
					title: "Title",
					render: ({ title }) => (
						<Text fw={600} style={{}}>
							{title}
						</Text>
					),
				},
				{
					accessor: "author_list",
					title: "Authors",
					render: ({ author_list }) => (
						<Text c="dimmed" lineClamp={2}>
							{formatAuthorList(author_list)}
						</Text>
					),
				},
				{
					accessor: "is_read",
					title: "Status",
					width: 110,
					render: ({ is_read }) => (
						<Badge
							color={is_read ? "gray" : "accent"}
							variant={is_read ? "light" : "filled"}
						>
							{is_read ? "Read" : "Unread"}
						</Badge>
					),
				},
				{
					accessor: "file_list",
					title: "Formats",
					width: 130,
					render: ({ file_list }) => (
						<Group gap={4}>
							{file_list
								.filter(isLocalFile)
								.slice(0, 3)
								.map((file) => (
									<Badge key={file.Local.mime_type} variant="outline" size="xs">
										{file.Local.mime_type}
									</Badge>
								))}
						</Group>
					),
				},
			]}
		/>
	);
};
