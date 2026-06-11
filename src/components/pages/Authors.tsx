import {
	ActionIcon,
	Anchor,
	Badge,
	Button,
	Center,
	Group,
	Modal,
	Stack,
	Text,
	TextInput,
} from "@mantine/core";
import { Link } from "@tanstack/react-router";
import { useCallback, useEffect, useState } from "react";

import type { AuthorUpdate, LibraryAuthor, LibraryBook } from "@/bindings";

import {
	useAuthors,
	useAuthorsLoading,
	useBooks,
	useBooksLoading,
	useLibraryActions,
} from "@/stores/library/store";

import { F7Pencil } from "../icons/F7Pencil";
import { F7Trash } from "../icons/F7Trash";
import { useDisclosure } from "@mantine/hooks";
import { useForm } from "@mantine/form";
import { AuthorFilterControls } from "@/components/organisms/AuthorFilterControls";
import { useAuthorFilters } from "@/lib/hooks/use-author-filters";

export const Authors = () => {
	const authors = useAuthors();
	const loadingAuthors = useAuthorsLoading();
	const books = useBooks();
	const loadingBooks = useBooksLoading();
	const actions = useLibraryActions();

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
		async (
			authorId: LibraryAuthor["id"],
			authorUpdate: AuthorUpdate,
		): Promise<void> => {
			if (actions) {
				await actions.updateAuthor(authorId, authorUpdate);
			}
		},
		[actions],
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

	const onConfirmDeleteAuthor = useCallback(async (): Promise<void> => {
		if (authorToDelete && actions) {
			await actions.deleteAuthor(authorToDelete.id);
			closeDeleteModal();
		}
	}, [actions, authorToDelete, closeDeleteModal]);

	if (loadingAuthors || loadingBooks) {
		return null;
	}

	return (
		<Stack h="100%" gap={0}>
			{authorToEdit && (
				<EditAuthorModal
					opened={editModalOpened}
					onClose={closeEditModal}
					authorToEdit={authorToEdit}
					onSubmitEdit={onSubmitEdit}
				/>
			)}
			<Modal
				opened={deleteModalOpened}
				onClose={closeDeleteModal}
				title="Delete author"
				styles={{
					content: {
						background: "var(--ctd-drawer-gradient)",
						border: "1px solid var(--ctd-border)",
					},
					header: {
						backgroundColor: "transparent",
						borderBottom: "1px solid var(--ctd-border)",
					},
				}}
			>
				{authorToDelete && (
					<Stack>
						<Text>
							Are you sure you want to delete the author &quot;
							{authorToDelete.name}&quot;?
						</Text>
						<Group gap="lg" grow mt="md">
							<Button color="red" onClick={() => void onConfirmDeleteAuthor()}>
								Delete
							</Button>
							<Button onClick={closeDeleteModal} variant="outline">
								Cancel
							</Button>
						</Group>
					</Stack>
				)}
			</Modal>

			<Group
				px={24}
				py={10}
				style={{
					flexShrink: 0,
					borderBottom: "1px solid var(--ctd-border)",
				}}
			>
				<AuthorFilterControls
					filters={filters}
					onSearchChange={setSearchTerm}
					onSortOrderChange={setSortOrder}
					onShowOnlyAuthorsWithoutBooksChange={setShowOnlyAuthorsWithoutBooks}
				/>
			</Group>

			<Stack gap={0} style={{ flex: 1 }}>
				{filteredAuthors?.map((author) => (
					<AuthorRow
						author={author}
						books={books}
						key={author.id}
						onEditAuthor={onOpenEditAuthorModal}
						onDeleteAuthor={onOpenDeleteAuthorModal}
					/>
				))}
			</Stack>

			<Center
				py={6}
				style={{
					position: "sticky",
					bottom: 0,
					backgroundColor: "var(--ctd-content-bg)",
					borderTop: "1px solid var(--ctd-border)",
				}}
			>
				<Text size="xs" c="dimmed">
					{filteredAuthors.length === authors.length
						? `${authors.length} authors`
						: `${filteredAuthors.length} of ${authors.length} authors`}
				</Text>
			</Center>
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
	) => Promise<void>;
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

	useEffect(() => {
		const nextValues = {
			displayName: authorToEdit.name ?? "",
			sortName: authorToEdit.sortable_name ?? "",
		};
		form.setValues(nextValues);
		form.resetDirty(nextValues);
		form.resetTouched();
	}, [authorToEdit, form]);

	const onSubmit = useCallback(
		(values: FormValues) => {
			void onSubmitEdit(authorToEdit.id, {
				full_name: values.displayName,
				sortable_name: values.sortName,
				external_url: null,
			});
			onClose();
		},
		[authorToEdit, onClose, onSubmitEdit],
	);

	return (
		<Modal
			opened={opened}
			onClose={onClose}
			title="Edit author"
			styles={{
				content: {
					background: "var(--ctd-drawer-gradient)",
					border: "1px solid var(--ctd-border)",
				},
				header: {
					backgroundColor: "transparent",
					borderBottom: "1px solid var(--ctd-border)",
				},
			}}
		>
			<form onSubmit={form.onSubmit(onSubmit)}>
				<Stack>
					<TextInput
						label="Full name"
						description="How the author's name is displayed"
						styles={{
							label: {
								color: "var(--ctd-ink-soft)",
							},
							description: {
								color: "var(--ctd-ink-soft)",
							},
							input: {
								backgroundColor: "var(--ctd-control-bg)",
								borderColor: "var(--ctd-border)",
								color: "var(--ctd-control-text)",
							},
						}}
						{...form.getInputProps("displayName")}
					/>
					<TextInput
						label="Sort name"
						description="Authors are sorted alphabetically by this name"
						styles={{
							label: {
								color: "var(--ctd-ink-soft)",
							},
							description: {
								color: "var(--ctd-ink-soft)",
							},
							input: {
								backgroundColor: "var(--ctd-control-bg)",
								borderColor: "var(--ctd-border)",
								color: "var(--ctd-control-text)",
							},
						}}
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

const AuthorRow = ({
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
		<Group
			px={24}
			py={8}
			gap="md"
			wrap="nowrap"
			justify="space-between"
			style={{ borderBottom: "1px solid var(--ctd-border)" }}
		>
			<Stack gap={2} style={{ minWidth: 0 }}>
				<Group gap="xs" wrap="nowrap">
					<Text fw={500} size="sm" truncate>
						{author.name}
					</Text>
					{author.sortable_name === "" && (
						<Badge size="xs" variant="light" color="red">
							No sort name
						</Badge>
					)}
				</Group>
				{author.sortable_name !== "" && (
					<Text size="xs" c="dimmed" truncate>
						{author.sortable_name}
					</Text>
				)}
			</Stack>

			<Group gap={4} wrap="nowrap" style={{ flexShrink: 0 }}>
				<Anchor
					to={"/"}
					search={{
						search_for_author: author.name,
					}}
					component={Link}
				>
					<Text size="sm" w={70} ta="right" style={{ color: "var(--ctd-link)" }}>
						{numBooksByAuthor} {pluralize("book", "books", numBooksByAuthor)}
					</Text>
				</Anchor>
				<ActionIcon
					variant="subtle"
					color="gray"
					size="sm"
					aria-label={`Edit ${author.name}`}
					onClick={() => onEditAuthor(author.id)}
				>
					<F7Pencil />
				</ActionIcon>
				{numBooksByAuthor === 0 && (
					<ActionIcon
						variant="subtle"
						color="red"
						size="sm"
						aria-label={`Delete ${author.name}`}
						onClick={() => onDeleteAuthor(author.id)}
					>
						<F7Trash />
					</ActionIcon>
				)}
			</Group>
		</Group>
	);
};
