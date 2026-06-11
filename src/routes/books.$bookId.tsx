import { createFileRoute, useParams } from "@tanstack/react-router";
import { type CSSProperties, useCallback, useMemo } from "react";
import type { BookUpdate, NewAuthor } from "@/bindings";
import { BookPage } from "@/components/pages/EditBook";
import { Spinner } from "@/components/ui";
import {
	LibraryState,
	useAuthors,
	useBooks,
	useLibraryActions,
	useLibraryState,
} from "@/stores/library/store";

const centeredFill: CSSProperties = {
	display: "flex",
	alignItems: "center",
	justifyContent: "center",
	height: "100%",
};

const EditBookRoute = () => {
	const { bookId } = useParams({ from: "/books/$bookId" });
	const state = useLibraryState();
	const actions = useLibraryActions();

	// Get data from store - no local state needed!
	const books = useBooks();
	const allAuthorList = useAuthors();
	const allTagList = useMemo(
		() =>
			Array.from(
				new Set(books.flatMap((candidate) => candidate.tag_list)),
			).sort((left, right) => left.localeCompare(right)),
		[books],
	);

	// Find the book from the store
	const book = useMemo(
		() => books.find((b) => b.id === bookId),
		[books, bookId],
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

	const onReloadBooks = useCallback(async () => {
		if (actions) {
			await actions.loadBooks();
		}
	}, [actions]);

	if (state !== LibraryState.ready) {
		return (
			<div style={centeredFill}>
				<Spinner size={18} />
			</div>
		);
	}
	if (!book) {
		return (
			<div style={centeredFill}>
				<span style={{ fontSize: 13, color: "var(--ctd-ink-soft)" }}>
					Book not found.
				</span>
			</div>
		);
	}

	return (
		<BookPage
			allAuthorList={allAuthorList}
			allTagList={allTagList}
			book={book}
			onCreateAuthor={onCreateAuthor}
			onSave={onSave}
			onUpsertIdentifier={onUpsertIdentifier}
			onDeleteIdentifier={onDeleteIdentifier}
			onReloadBooks={onReloadBooks}
		/>
	);
};

export const Route = createFileRoute("/books/$bookId")({
	component: EditBookRoute,
});
