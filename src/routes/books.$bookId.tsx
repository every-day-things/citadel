import type {
	BookUpdate,
	NewAuthor,
} from "@/bindings";
import { BookPage } from "@/components/pages/EditBook";
import { LibraryState, useBooks, useAuthors, useLibraryState } from "@/stores/library/store";
import { useLibraryActions } from "@/stores/library/actions";
import { createFileRoute, useParams } from "@tanstack/react-router";
import { useCallback, useMemo } from "react";

const EditBookRoute = () => {
	const { bookId } = useParams({ from: "/books/$bookId" });
	const state = useLibraryState();
	const actions = useLibraryActions();

	// Get data from store - no local state needed!
	const books = useBooks();
	const allAuthorList = useAuthors();

	// Find the book from the store
	const book = useMemo(
		() => books.find((b) => b.id === bookId),
		[books, bookId]
	);

	const onSave = useCallback(
		async (bookUpdate: BookUpdate) => {
			if (actions) {
				await actions.updateBook(bookId, bookUpdate);
			}
		},
		[actions, bookId],
	);

	const onCreateAuthor = useCallback(
		async (authorName: string) => {
			const newAuthor: NewAuthor = {
				name: authorName,
				sortable_name: authorName,
			};

			if (actions) {
				await actions.createAuthors([newAuthor]);
			}
		},
		[actions],
	);

	const onUpsertIdentifier = useCallback(
		async (
			bookId: string,
			identifierId: number | null,
			label: string,
			value: string,
		) => {
			if (actions) {
				await actions.upsertBookIdentifier(bookId, identifierId, label, value);
			}
		},
		[actions],
	);

	const onDeleteIdentifier = useCallback(
		async (bookId: string, identifierId: number) => {
			if (actions) {
				await actions.deleteBookIdentifier(bookId, identifierId);
			}
		},
		[actions],
	);

	if (state !== LibraryState.ready) {
		return <div>Loading...</div>;
	}
	if (!book) {
		return <div>Book not found</div>;
	}

	return (
		<BookPage
			allAuthorList={allAuthorList}
			book={book}
			onCreateAuthor={async (name) => { await onCreateAuthor(name); }}
			onSave={onSave}
			onUpsertIdentifier={onUpsertIdentifier}
			onDeleteIdentifier={onDeleteIdentifier}
		/>
	);
};

export const Route = createFileRoute("/books/$bookId")({
	component: EditBookRoute,
});
