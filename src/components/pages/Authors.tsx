import {
	ActionIcon,
	Anchor,
	Badge,
	Button,
	Card,
	Center,
	Group,
	Menu,
	Modal,
	Stack,
	Text,
	TextInput,
	Title,
} from "@mantine/core";
import { Link } from "@tanstack/react-router";
import { useCallback, useState } from "react";

import { AuthorUpdate, LibraryAuthor, LibraryBook } from "@/bindings";
import { useLoadAuthors } from "@/lib/hooks/use-load-authors";
import { useLoadBooks } from "@/lib/hooks/use-load-books";
import { useLibrary } from "@/lib/contexts/library";
import { LibraryEventNames } from "@/lib/contexts/library/context";

import { F7Ellipsis } from "../icons/F7Ellipsis";
import { F7Pencil } from "../icons/F7Pencil";
import { useDisclosure } from "@mantine/hooks";
import { useForm } from "@mantine/form";

export const Authors = () => {
	const { library, eventEmitter } = useLibrary();
	const [loadingAuthors, authors] = useLoadAuthors();
	const [loadingBooks, books] = useLoadBooks();

	const [opened, { open, close }] = useDisclosure(false);
	const [authorToEdit, setAuthorToEdit] = useState<LibraryAuthor | null>(null);

	const onSubmitEdit = useCallback(
		(authorId: LibraryAuthor["id"], authorUpdate: AuthorUpdate): void => {
			void library?.updateAuthor(authorId, authorUpdate);
			// Ew why does this business logic exist here.
			// Why does our useLibrary hook not automatically emit events as needed??
			eventEmitter?.emit(LibraryEventNames.LIBRARY_AUTHOR_UPDATED, {
				author: authorId,
			});
		},
		[eventEmitter, library],
	);
	const onOpenEditAuthorModal = useCallback(
		(authorId: string): void => {
			setAuthorToEdit(authors.find(({ id }) => id === authorId) ?? null);
			open();
		},
		[open, authors],
	);

	if (loadingAuthors || loadingBooks) {
		return null;
	}

	return (
		<>
			<Modal opened={opened} onClose={close} title="Edit author">
				{authorToEdit && (
					<EditAuthorModal
						opened={opened}
						onClose={close}
						authorToEdit={authorToEdit}
						onSubmitEdit={onSubmitEdit}
					/>
				)}
			</Modal>
			<Stack gap="xs">
				<Title order={1} mb="xs">
					Authors
				</Title>
				<Text>Showing {authors.length} authors</Text>
			</Stack>

			<Center>
				<Stack maw="480">
					{authors?.map((author) => (
						<AuthorCard
							author={author}
							books={books}
							key={author.id}
							onEditAuthor={onOpenEditAuthorModal}
						/>
					))}
				</Stack>
			</Center>
		</>
	);
};

const EditAuthorModal = ({
	opened,
	onClose,
	authorToEdit,
	onSubmitEdit,
}: {
	opened: boolean;
	onClose: () => void;
	authorToEdit: LibraryAuthor;
	onSubmitEdit: (
		authorId: LibraryAuthor["id"],
		authorUpdate: AuthorUpdate,
	) => void;
}) => {
	const form = useForm({
		initialValues: {
			displayName: authorToEdit.name ?? "",
			sortName: authorToEdit.sortable_name ?? "",
		},
		validate: {
			displayName: (value) =>
				value.length > 0 ? undefined : "Name is required",
			sortName: (value) =>
				value.length > 0 ? undefined : "Sort name is required",
		},
	});
	type FormValues = typeof form.values;

	const onSubmit = useCallback(
		(values: FormValues) => {
			onSubmitEdit(authorToEdit.id, {
				full_name: values.displayName,
				sortable_name: values.sortName,
				external_url: null,
			});
			onClose();
		},
		[authorToEdit, onClose, onSubmitEdit],
	);

	return (
		<Modal opened={opened} onClose={onClose} title="Edit author">
			<form onSubmit={form.onSubmit(onSubmit)}>
				<Stack>
					<TextInput
						label="Full name"
						description="How the author's name is displayed"
						{...form.getInputProps("displayName")}
					/>
					<TextInput
						label="Sort name"
						description="Authors are sorted alphabetically by this name"
						{...form.getInputProps("sortName")}
					/>
					<Group gap="lg" grow mt="md">
						<Button type="submit">Save</Button>
						<Button onClick={onClose} variant="outline">
							Cancel
						</Button>
					</Group>
				</Stack>
			</form>
		</Modal>
	);
};

const pluralize = (single: string, multiple: string, count: number): string =>
	count === 1 ? single : multiple;

const AuthorCard = ({
	author,
	books,
	onEditAuthor,
}: {
	author: LibraryAuthor;
	books: LibraryBook[];
	onEditAuthor: (authorId: string) => void;
}) => {
	const numBooksByAuthor = books.filter((book) =>
		new Set(book.author_list.map((a) => a.id)).has(author.id),
	).length;
	return (
		<Card w={"480"} key={author.id}>
			<Group justify="space-between" mb="xs">
				<Group mb="sm">
					<Stack gap="xs">
						<Text fw={500}>{author.name}</Text>
						{author.sortable_name !== "" && (
							<Text size="xs" fs="italic" mt="0" c="dimmed">
								{author.sortable_name}
							</Text>
						)}
					</Stack>
					{author.sortable_name === "" && (
						<Badge color="red">No sort name</Badge>
					)}
				</Group>
				<Menu withinPortal position="bottom-end" shadow="sm">
					<Menu.Target>
						<ActionIcon variant="subtle" color="gray">
							<F7Ellipsis />
						</ActionIcon>
					</Menu.Target>

					<Menu.Dropdown>
						<Menu.Item
							leftSection={<F7Pencil />}
							onPointerDown={() => onEditAuthor(author.id)}
						>
							Edit
						</Menu.Item>
					</Menu.Dropdown>
				</Menu>
			</Group>

			<Anchor
				to={"/"}
				search={{
					search_for_author: author.name,
				}}
				component={Link}
			>
				<Text size="sm">
					{numBooksByAuthor} {pluralize("book", "books", numBooksByAuthor)}
				</Text>
			</Anchor>
		</Card>
	);
};
