import type { BookUpdate, LibraryAuthor, LibraryBook } from "@/bindings";
import { BookPage } from "@/components/pages/EditBook";
import { safeAsyncEventHandler } from "@/lib/async";
import { LibraryState, useLibrary } from "@/lib/contexts/library";
import { LibraryEventNames } from "@/lib/contexts/library/context";
import type { Library } from "@/lib/services/library";
import { createFileRoute, useParams } from "@tanstack/react-router";
import { useCallback, useEffect, useState } from "react";

const libraryIsReady = (
	state: LibraryState,
	_library: Library | null,
): _library is Library => state === LibraryState.ready;

const EditBookRoute = () => {
	const { bookId } = useParams({ from: "/books/$bookId" });
	const { library, state, eventEmitter } = useLibrary();

	const [book, setBook] = useState<LibraryBook | undefined>();
	const [allAuthorList, setAllAuthorList] = useState<LibraryAuthor[]>([]);

	const loadBook = useCallback(async () => {
		if (!libraryIsReady(state, library)) {
			return;
		}

		const [bookList, authorList] = await Promise.all([
			library.listBooks(),
			library.listAuthors(),
		]);

		const matchingBook = bookList.find((b) => b.id === bookId);

		if (matchingBook) {
			setBook(matchingBook);
		}

		setAllAuthorList(authorList);
	}, [bookId, library, state]);

	useEffect(() => {
		// Load book on first render
		safeAsyncEventHandler(loadBook)();
	}, [loadBook]);

	useEffect(() => {
		// Re-load `book` when Library emits "book updated" event, to capture
		// any changes automatically done by the backend
		const unsubUpdatedBook = eventEmitter?.listen(
			LibraryEventNames.LIBRARY_BOOK_UPDATED,
			safeAsyncEventHandler(async () => {
				await loadBook();
			}),
		);

		return unsubUpdatedBook;
	}, [eventEmitter, loadBook]);

	const onSave = useCallback(
		async (bookUpdate: BookUpdate) => {
			await library?.updateBook(bookId, bookUpdate);

			if (bookId) {
				eventEmitter?.emit(LibraryEventNames.LIBRARY_BOOK_UPDATED, {
					book: bookId,
				});
			}

			return Promise.resolve();
		},
		[library, bookId, eventEmitter],
	);

	const onUpsertIdentifier = useCallback(
		async (
			bookId: string,
			identifierId: number | null,
			label: string,
			value: string,
		) => {
			await library?.upsertBookIdentifier(bookId, identifierId, label, value);

			if (bookId) {
				eventEmitter?.emit(LibraryEventNames.LIBRARY_BOOK_UPDATED, {
					book: bookId,
				});
			}

			return Promise.resolve();
		},
		[library, eventEmitter],
	);
	const onDeleteIdentifier = useCallback(
		async (bookId: string, identifierId: number) => {
			await library?.deleteBookIdentifier(bookId, identifierId);

			if (bookId) {
				eventEmitter?.emit(LibraryEventNames.LIBRARY_BOOK_UPDATED, {
					book: bookId,
				});
			}

			return Promise.resolve();
		},
		[library, eventEmitter],
	);

	if (state !== LibraryState.ready) {
		return <div>Loading...</div>;
	}
	if (!book) {
		return <div>Book not found</div>;
	}

	return (
		<BookPage
			book={book}
			allAuthorList={allAuthorList}
			onSave={onSave}
			onUpsertIdentifier={onUpsertIdentifier}
			onDeleteIdentifier={onDeleteIdentifier}
		/>
	);
};

export const Route = createFileRoute("/books/$bookId")({
	component: EditBookRoute,
});
