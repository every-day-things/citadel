import { useCallback, useEffect, useState } from "react";

import { LibraryBook } from "@/bindings";
import { LibraryState, useLibrary } from "@/lib/contexts/library";
import { LibraryEventNames } from "@/lib/contexts/library/context";

export const useLoadBooks = () => {
	const [loading, setLoading] = useState(true);
	const [books, setBooks] = useState<LibraryBook[]>([]);
	const { library, state, eventEmitter } = useLibrary();
	const updateBooklist = useCallback(() => {
		setLoading(true);
		void (async () => {
			if (state !== LibraryState.ready) {
				return;
			}

			const books = await library.listBooks();
			setBooks(books);
			setLoading(false);
		})();
	}, [library, state]);

	useEffect(() => {
		updateBooklist();
	}, [updateBooklist]);

	useEffect(() => {
		if (state !== LibraryState.ready) {
			return;
		}

		const unsubNewBook = eventEmitter.listen(
			LibraryEventNames.LIBRARY_BOOK_CREATED,
			() => {
				updateBooklist();
			},
		);
		const unsubUpdatedBook = eventEmitter.listen(
			LibraryEventNames.LIBRARY_BOOK_UPDATED,
			() => {
				updateBooklist();
			},
		);

		return () => {
			unsubNewBook();
			unsubUpdatedBook();
		};
	}, [state, eventEmitter, updateBooklist]);

	return [loading, books] as const;
};
