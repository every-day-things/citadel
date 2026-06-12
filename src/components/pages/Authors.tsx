import { Link } from "@tanstack/react-router";
import clsx from "clsx";
import {
	type CSSProperties,
	type FormEvent,
	useCallback,
	useEffect,
	useRef,
	useState,
} from "react";

import type { AuthorUpdate, LibraryAuthor, LibraryBook } from "@/bindings";
import { AuthorFilterControls } from "@/components/organisms/AuthorFilterControls";
import {
	AlertDialog,
	Button,
	FormField,
	IconButton,
	Sheet,
	TextInput,
} from "@/components/ui";
import { useAuthorFilters } from "@/lib/hooks/use-author-filters";
import {
	useAllBooks,
	useAuthors,
	useAuthorsLoading,
	useLibraryActions,
} from "@/stores/library/store";
import { F7Pencil } from "../icons/F7Pencil";
import { F7Trash } from "../icons/F7Trash";
import styles from "./Authors.module.css";

/**
 * Shared column template so the header row and every author row align:
 * name (flexible) | sort name (fixed, hidden narrow) | count | actions.
 */
const AUTHOR_GRID: CSSProperties = {
	display: "grid",
	gridTemplateColumns: "minmax(160px, 1fr) minmax(0, 260px) 72px 56px",
	alignItems: "center",
	columnGap: 16,
};

export const Authors = () => {
	const authors = useAuthors();
	const loadingAuthors = useAuthorsLoading();
	// Whole-library list (lazy): per-author book counts and the
	// "authors without books" filter need every book↔author link, and no
	// targeted per-author count query exists. See LibraryActions.loadBooks.
	const { books, loading: loadingBooks } = useAllBooks();
	const actions = useLibraryActions();

	const {
		filters,
		setSearchTerm,
		setSortOrder,
		setShowOnlyAuthorsWithoutBooks,
		filteredAuthors,
	} = useAuthorFilters(authors, books);

	const [editSheetOpened, setEditSheetOpened] = useState(false);
	const [deleteDialogOpened, setDeleteDialogOpened] = useState(false);

	const [authorToEdit, setAuthorToEdit] = useState<LibraryAuthor | null>(null);
	const [authorToDelete, setAuthorToDelete] = useState<LibraryAuthor | null>(
		null,
	);

	// The sheet opens from a per-row pencil button, not a Dialog.Trigger, so
	// Radix cannot restore focus on close; remember the opener ourselves.
	const editOpenerRef = useRef<HTMLElement | null>(null);

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

	const onOpenEditAuthorSheet = useCallback(
		(authorId: string): void => {
			editOpenerRef.current =
				document.activeElement instanceof HTMLElement
					? document.activeElement
					: null;
			setAuthorToEdit(
				filteredAuthors.find(({ id }) => id === authorId) ?? null,
			);
			setEditSheetOpened(true);
		},
		[filteredAuthors],
	);

	const onOpenDeleteAuthorDialog = useCallback(
		(authorId: string): void => {
			setAuthorToDelete(
				filteredAuthors.find(({ id }) => id === authorId) ?? null,
			);
			setDeleteDialogOpened(true);
		},
		[filteredAuthors],
	);

	const onConfirmDeleteAuthor = useCallback(async (): Promise<void> => {
		if (authorToDelete && actions) {
			await actions.deleteAuthor(authorToDelete.id);
			setDeleteDialogOpened(false);
		}
	}, [actions, authorToDelete]);

	if (loadingAuthors || loadingBooks) {
		return null;
	}

	return (
		<div className={styles.page}>
			{authorToEdit && (
				<EditAuthorSheet
					opened={editSheetOpened}
					onClose={() => setEditSheetOpened(false)}
					authorToEdit={authorToEdit}
					onSubmitEdit={onSubmitEdit}
					onCloseAutoFocus={(event) => {
						event.preventDefault();
						editOpenerRef.current?.focus();
					}}
				/>
			)}
			<AlertDialog
				open={deleteDialogOpened}
				onOpenChange={setDeleteDialogOpened}
				title="Delete author"
				description={
					authorToDelete
						? `Are you sure you want to delete "${authorToDelete.name}"? This cannot be undone.`
						: undefined
				}
				confirmLabel="Delete"
				destructive
				onConfirm={() => void onConfirmDeleteAuthor()}
			/>

			<div className={styles.filterBar}>
				<AuthorFilterControls
					filters={filters}
					onSearchChange={setSearchTerm}
					onSortOrderChange={setSortOrder}
					onShowOnlyAuthorsWithoutBooksChange={setShowOnlyAuthorsWithoutBooks}
				/>
			</div>

			<div className={styles.headerRow} style={AUTHOR_GRID}>
				<span className={styles.columnLabel}>Name</span>
				<span className={clsx(styles.columnLabel, styles.visibleFromMd)}>
					Sort name
				</span>
				<span className={clsx(styles.columnLabel, styles.columnLabelRight)}>
					Books
				</span>
				<span />
			</div>

			<div className={styles.rows}>
				{filteredAuthors?.map((author) => (
					<AuthorRow
						author={author}
						books={books}
						key={author.id}
						onEditAuthor={onOpenEditAuthorSheet}
						onDeleteAuthor={onOpenDeleteAuthorDialog}
					/>
				))}
			</div>

			<div className={styles.footer}>
				<span className={styles.footerText}>
					{filteredAuthors.length === authors.length
						? `${authors.length} authors`
						: `${filteredAuthors.length} of ${authors.length} authors`}
				</span>
			</div>
		</div>
	);
};

const EditAuthorSheet = ({
	opened,
	onClose,
	authorToEdit,
	onSubmitEdit,
	onCloseAutoFocus,
}: {
	opened: boolean;
	onClose: () => void;
	authorToEdit: LibraryAuthor;
	onSubmitEdit: (
		authorId: LibraryAuthor["id"],
		authorUpdate: AuthorUpdate,
	) => Promise<void>;
	onCloseAutoFocus?: (event: Event) => void;
}) => {
	const [displayName, setDisplayName] = useState(authorToEdit.name ?? "");
	const [sortName, setSortName] = useState(authorToEdit.sortable_name ?? "");
	const [errors, setErrors] = useState<{
		displayName?: string;
		sortName?: string;
	}>({});

	// Values reset whenever a different author is opened.
	useEffect(() => {
		setDisplayName(authorToEdit.name ?? "");
		setSortName(authorToEdit.sortable_name ?? "");
		setErrors({});
	}, [authorToEdit]);

	const onSubmit = (event: FormEvent<HTMLFormElement>) => {
		event.preventDefault();
		const nextErrors = {
			displayName: displayName.length > 0 ? undefined : "Name is required",
			sortName: sortName.length > 0 ? undefined : "Sort name is required",
		};
		if (nextErrors.displayName || nextErrors.sortName) {
			setErrors(nextErrors);
			return;
		}
		void onSubmitEdit(authorToEdit.id, {
			full_name: displayName,
			sortable_name: sortName,
			external_url: null,
		});
		onClose();
	};

	return (
		<Sheet
			open={opened}
			onOpenChange={(open) => {
				if (!open) onClose();
			}}
			title="Edit author"
			width={380}
			onCloseAutoFocus={onCloseAutoFocus}
		>
			<form onSubmit={onSubmit}>
				<div className={styles.sheetFields}>
					<FormField
						label="Full name"
						description="How the author's name is displayed"
						error={errors.displayName}
					>
						<TextInput
							value={displayName}
							onChange={(event) => {
								setDisplayName(event.currentTarget.value);
								setErrors((prev) => ({ ...prev, displayName: undefined }));
							}}
						/>
					</FormField>
					<FormField
						label="Sort name"
						description="Authors are sorted alphabetically by this name"
						error={errors.sortName}
					>
						<TextInput
							value={sortName}
							onChange={(event) => {
								setSortName(event.currentTarget.value);
								setErrors((prev) => ({ ...prev, sortName: undefined }));
							}}
						/>
					</FormField>
				</div>
				<div className={styles.sheetFooter}>
					<Button onClick={onClose}>Cancel</Button>
					<Button type="submit" variant="primary">
						Save
					</Button>
				</div>
			</form>
		</Sheet>
	);
};

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
		// The whole row links to the library filtered by this author. The hover
		// background, 40px min-height, and the overlay-link positioning live in
		// styles.css (.ctd-author-row / .ctd-author-row-link).
		<div className={clsx("ctd-author-row", styles.row)} style={AUTHOR_GRID}>
			{/* Real anchor overlaying the row so middle-click / cmd-click /
			    keyboard all work. The count link and the action icons sit above
			    it (position: relative + zIndex), so they keep working on their
			    own without stopPropagation. */}
			<Link
				to="/"
				search={{ author_id: author.id }}
				className="ctd-author-row-link"
				aria-label={`Show books by ${author.name}`}
			/>

			<span className={styles.cellText}>{author.name}</span>

			{author.sortable_name !== "" ? (
				<span
					className={clsx(styles.cellText, styles.dimmed, styles.visibleFromMd)}
				>
					{author.sortable_name}
				</span>
			) : (
				<div>
					<span className={clsx(styles.badge, styles.visibleFromMd)}>
						No sort name
					</span>
				</div>
			)}

			<Link
				to="/"
				search={{ author_id: author.id }}
				className={styles.countLink}
			>
				{numBooksByAuthor}
			</Link>

			<div className={styles.actions}>
				<IconButton
					className={styles.actionIcon}
					aria-label={`Edit ${author.name}`}
					onClick={() => onEditAuthor(author.id)}
				>
					<F7Pencil />
				</IconButton>
				{numBooksByAuthor === 0 ? (
					<IconButton
						className={clsx(styles.actionIcon, styles.dangerIcon)}
						aria-label={`Delete ${author.name}`}
						onClick={() => onDeleteAuthor(author.id)}
					>
						<F7Trash />
					</IconButton>
				) : (
					<span className={styles.actionSpacer} />
				)}
			</div>
		</div>
	);
};
