import { useCallback, useEffect, useState } from "react";

import { LibraryAuthor } from "@/bindings";
import { LibraryState, useLibrary } from "@/lib/contexts/library";
import { LibraryEventNames } from "@/lib/contexts/library/context";
import { sortAuthors } from "@/lib/domain/author";

export const useLoadAuthors = () => {
	const { library, state, eventEmitter } = useLibrary();
	const [loading, setLoading] = useState(true);
	const [authors, setAuthors] = useState<LibraryAuthor[]>([]);

	const updateAuthorList = useCallback(() => {
		setLoading(true);
		void (async () => {
			if (state !== LibraryState.ready) {
				return;
			}

			const authors = await library.listAuthors();

			setAuthors(authors.sort(sortAuthors));
			setLoading(false);
		})();
	}, [library, state]);

	useEffect(() => {
		updateAuthorList();
	}, [updateAuthorList]);

	useEffect(() => {
		if (state !== LibraryState.ready) {
			return;
		}

		const unsubNewAuthor = eventEmitter.listen(
			LibraryEventNames.LIBRARY_AUTHOR_CREATED,
			() => {
				updateAuthorList();
			},
		);
		const unsubUpdatedAuthor = eventEmitter.listen(
			LibraryEventNames.LIBRARY_AUTHOR_UPDATED,
			() => {
				updateAuthorList();
			},
		);
		const unsubDeletedAuthor = eventEmitter.listen(
			LibraryEventNames.LIBRARY_AUTHOR_DELETED,
			() => {
				updateAuthorList();
			},
		);

		return () => {
			unsubNewAuthor();
			unsubUpdatedAuthor();
			unsubDeletedAuthor();
		};
	}, [state, eventEmitter, updateAuthorList]);

	return [loading, authors] as const;
};
