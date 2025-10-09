import { useMemo, useState } from "react";
import { LibraryAuthor, LibraryBook } from "@/bindings";
import { sortAuthors } from "@/lib/domain/author";

export const AuthorSortOrder = {
	nameAz: "name-asc",
	nameZa: "name-desc",
} as const;

export type AuthorSortOrderValue =
	(typeof AuthorSortOrder)[keyof typeof AuthorSortOrder];

export const AuthorSortOrderLabel: Record<
	keyof typeof AuthorSortOrder,
	string
> = {
	nameAz: "Name (A-Z)",
	nameZa: "Name (Z-A)",
} as const;

export const sortOrderOptions: {
	value: AuthorSortOrderValue;
	label: string;
}[] = Object.entries(AuthorSortOrder).map(([key, value]) => ({
	value,
	label: AuthorSortOrderLabel[key as keyof typeof AuthorSortOrder],
}));

export interface AuthorFilters {
	searchTerm: string;
	sortOrder: AuthorSortOrderValue;
	showOnlyAuthorsWithoutBooks: boolean;
}

export interface UseAuthorFiltersReturn {
	filters: AuthorFilters;
	setSearchTerm: (term: string) => void;
	setSortOrder: (order: AuthorSortOrderValue) => void;
	setShowOnlyAuthorsWithoutBooks: (show: boolean) => void;
	filteredAuthors: LibraryAuthor[];
}

export const useAuthorFilters = (
	authors: LibraryAuthor[],
	books: LibraryBook[],
): UseAuthorFiltersReturn => {
	const [searchTerm, setSearchTerm] = useState("");
	const [sortOrder, setSortOrder] = useState<AuthorSortOrderValue>(
		AuthorSortOrder.nameAz,
	);
	const [showOnlyAuthorsWithoutBooks, setShowOnlyAuthorsWithoutBooks] =
		useState(false);

	const filteredAuthors = useMemo(() => {
		let result = [...authors];

		if (searchTerm.trim()) {
			const searchLower = searchTerm.toLowerCase();
			result = result.filter(
				(author) =>
					author.name.toLowerCase().includes(searchLower) ||
					author.sortable_name?.toLowerCase().includes(searchLower),
			);
		}

		if (showOnlyAuthorsWithoutBooks) {
			const authorIdsWithBooks = new Set(
				books.flatMap((book) => book.author_list.map((a) => a.id)),
			);
			result = result.filter((author) => !authorIdsWithBooks.has(author.id));
		}

		result.sort(sortAuthors);

		if (sortOrder === AuthorSortOrder.nameZa) {
			result.reverse();
		}

		return result;
	}, [authors, books, searchTerm, sortOrder, showOnlyAuthorsWithoutBooks]);

	return {
		filters: {
			searchTerm,
			sortOrder,
			showOnlyAuthorsWithoutBooks,
		},
		setSearchTerm,
		setSortOrder,
		setShowOnlyAuthorsWithoutBooks,
		filteredAuthors,
	};
};
