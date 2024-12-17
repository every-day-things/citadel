import {
	ActionIcon,
	Anchor,
	Card,
	Center,
	Group,
	Menu,
	Stack,
	Text,
	Title,
} from "@mantine/core";
import { Link } from "@tanstack/react-router";

import { LibraryAuthor, LibraryBook } from "@/bindings";
import { useLoadAuthors } from "@/lib/hooks/use-load-authors";
import { useLoadBooks } from "@/lib/hooks/use-load-books";

import { F7Ellipsis } from "../icons/F7Ellipsis";
import { F7Pencil } from "../icons/F7Pencil";

export const Authors = () => {
	const [loadingAuthors, authors] = useLoadAuthors();
	const [loadingBooks, books] = useLoadBooks();

	if (loadingAuthors || loadingBooks) {
		return null;
	}

	return (
		<>
			<Stack gap="xs">
				<Title order={1} mb="xs">
					Authors
				</Title>
				<Text>
					Showing {authors.length} authors
				</Text>
			</Stack>

			<Center>
				<Stack maw="300">
					{authors?.map((author) => (
						<AuthorCard author={author} books={books} key={author.id} />
					))}
				</Stack>
			</Center>
		</>
	);
};

function AuthorCard({
	author,
	books,
}: { author: LibraryAuthor; books: LibraryBook[] }) {
	return (
		<Card w={"300"} key={author.id}>
			<Group justify="space-between" mb="xs">
				<Text fw={500}>{author.name}</Text>
			</Group>

			<Anchor
				to={"/"}
				search={{
					search_for_author: author.name,
				}}
				component={Link}
			>
				<Text size="sm">
					{
						books.filter((book) =>
							new Set(book.author_list.map((a) => a.id)).has(author.id),
						).length
					}{" "}
					books
				</Text>
			</Anchor>
		</Card>
	);
}
