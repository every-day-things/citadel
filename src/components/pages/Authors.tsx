import {
	ActionIcon,
	Anchor,
	Badge,
	Button,
	Card,
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
import { F7Trash } from "../icons/F7Trash";
import { useDisclosure } from "@mantine/hooks";
import { useForm } from "@mantine/form";
import { AuthorFilterControls } from "@/components/organisms/AuthorFilterControls";
import { useAuthorFilters } from "@/lib/hooks/use-author-filters";

export const Authors = () => {
	const { library, eventEmitter } = useLibrary();
	const [loadingAuthors, authors] = useLoadAuthors();
	const [loadingBooks, books] = useLoadBooks();

	const {
		filters,
		setSearchTerm,
		setSortOrder,
		setShowOnlyAuthorsWithoutBooks,
		filteredAuthors,
	} = useAuthorFilters(authors, books);

	const [editModalOpened, { open: openEditModal, close: closeEditModal }] =
		useDisclosure(false);

	const [
		deleteModalOpened,
		{ open: openDeleteModal, close: closeDeleteModal },
	] = useDisclosure(false);

	const [authorToEdit, setAuthorToEdit] = useState<LibraryAuthor | null>(null);
	const [authorToDelete, setAuthorToDelete] = useState<LibraryAuthor | null>(
		null,
	);

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
			setAuthorToEdit(
				filteredAuthors.find(({ id }) => id === authorId) ?? null,
			);
			openEditModal();
		},
		[openEditModal, filteredAuthors],
	);

	const onOpenDeleteAuthorModal = useCallback(
		(authorId: string): void => {
			setAuthorToDelete(
				filteredAuthors.find(({ id }) => id === authorId) ?? null,
			);
			openDeleteModal();
		},
		[openDeleteModal, filteredAuthors],
	);

	const onConfirmDeleteAuthor = useCallback((): void => {
		if (authorToDelete) {
			void library?.deleteAuthor(authorToDelete.id);

			eventEmitter?.emit(LibraryEventNames.LIBRARY_AUTHOR_DELETED, {
				author: authorToDelete.id,
			});

			closeDeleteModal();
		}
	}, [eventEmitter, library, authorToDelete, closeDeleteModal]);

	if (loadingAuthors || loadingBooks) {
		return null;
	}

	return (
		<Stack h="100%" gap={0}>
			<Modal
				opened={editModalOpened}
				onClose={closeEditModal}
				title="Edit author"
			>
				{authorToEdit && (
					<EditAuthorModal
						opened={editModalOpened}
						onClose={closeEditModal}
						authorToEdit={authorToEdit}
						onSubmitEdit={onSubmitEdit}
					/>
				)}
			</Modal>
			<Modal
				opened={deleteModalOpened}
				onClose={closeDeleteModal}
				title="Delete author"
			>
				{authorToDelete && (
					<Stack>
						<Text>
							Are you sure you want to delete the author &quot;
							{authorToDelete.name}&quot;?
						</Text>
						<Group gap="lg" grow mt="md">
							<Button color="red" onClick={onConfirmDeleteAuthor}>
								Delete
							</Button>
							<Button onClick={closeDeleteModal} variant="outline">
								Cancel
							</Button>
						</Group>
					</Stack>
				)}
			</Modal>

			<Stack gap="xs" style={{ flexShrink: 0 }} p="md" pb="sm">
				<Title order={1} mb={0}>
					Authors
				</Title>

				<AuthorFilterControls
					filters={filters}
					onSearchChange={setSearchTerm}
					onSortOrderChange={setSortOrder}
					onShowOnlyAuthorsWithoutBooksChange={setShowOnlyAuthorsWithoutBooks}
				/>

				<Text size="sm" c="dimmed">
					Showing {filteredAuthors.length} authors
				</Text>
			</Stack>

			<Stack
				style={{ flex: 1, overflow: "auto" }}
				align="center"
				justify="flex-start"
				p="md"
				pt={0}
			>
				<Stack maw="480" w="100%" gap="md" align="stretch">
					{filteredAuthors?.map((author) => (
						<AuthorCard
							author={author}
							books={books}
							key={author.id}
							onEditAuthor={onOpenEditAuthorModal}
							onDeleteAuthor={onOpenDeleteAuthorModal}
						/>
					))}
				</Stack>
			</Stack>
		</Stack>
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
	onDeleteAuthor,
}: {
	author: LibraryAuthor;
	books: LibraryBook[];
	onEditAuthor: (authorId: string) => void;
	onDeleteAuthor: (authorId: string) => void;
}) => {
	const numBooksByAuthor = books.filter((book) =>
		new Set(book.author_list.map((a) => a.id)).has(author.id),
	).length;

	return (
		<Card w={"480"} key={author.id} shadow="sm" withBorder>
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
						{numBooksByAuthor === 0 && (
							<Menu.Item
								leftSection={<F7Trash />}
								onPointerDown={() => onDeleteAuthor(author.id)}
								color="red"
							>
								Delete
							</Menu.Item>
						)}
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
