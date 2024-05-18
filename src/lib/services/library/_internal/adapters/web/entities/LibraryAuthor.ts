import { LibraryAuthor } from "@/bindings";

import { Author } from "./Author";

export const libraryAuthor = {
	fromAuthor: (author: Author): LibraryAuthor => {
		return {
			id: author.id.toString(),
			name: author.name,
			sortable_name: author.sort ?? author.name,
		};
	},
};
