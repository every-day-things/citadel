import { LibraryAuthor, LibraryBook } from "@/bindings";
import { BookPage } from "@/components/pages/EditBook";
import { safeAsyncEventHandler } from "@/lib/async";
import { LibraryState, useLibrary } from "@/lib/contexts/library";
import {
	createFileRoute,
	useNavigate,
	useParams,
} from "@tanstack/react-router";
import { useCallback, useEffect, useState } from "react";

const EditBookRoute = () => {
	const navigate = useNavigate();
	const { bookId } = useParams({ from: "/books/$bookId" });
	const { library, state } = useLibrary();

	const [book, setBook] = useState<LibraryBook | undefined>();
	const [allAuthorList, setAllAuthorList] = useState<LibraryAuthor[]>([]);

	useEffect(() => {
		safeAsyncEventHandler(async () => {
			if (state !== LibraryState.ready) {
				return;
			}

			const booklistPromise = library.listBooks();
			const authorlistPromise = library.listAuthors();

			const [bookList, authorList] = await Promise.all([
				booklistPromise,
				authorlistPromise,
			]);

			const matchingBook = bookList.find((b) => b.id === bookId);
			if (matchingBook) {
				setBook(matchingBook);
			}
			setAllAuthorList(authorList);
		})();
	}, [bookId, library, state]);

	const onSave = useCallback(async () => {
		// TODO: Fix this hacky bodge that reloads the data we collected in our
		// `EditBookRoute` component in our routes. This sucks!
		await navigate({ to: "/" })
			.then(() => {
				return navigate({ to: `/books/${bookId}` });
			})
			.catch((e) => {
				console.error(e);
			});
	}, [bookId, navigate]);

	if (state !== LibraryState.ready) {
		return <div>Loading...</div>;
	}
	if (!book) {
		return <div>Book not found</div>;
	}

	return (
		<BookPage
			book={book}
			library={library}
			allAuthorList={allAuthorList}
			onSave={onSave}
		/>
	);
};

export const Route = createFileRoute("/books/$bookId")({
	component: EditBookRoute,
});
