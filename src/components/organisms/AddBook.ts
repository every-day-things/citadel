import { promptToAddBook } from "$lib/library/addBook";
import { libraryClient } from "../../stores/library";

export async function beginAddBookHandler() {
	return promptToAddBook(libraryClient());
}

export function pluralize(count: number, singular: string, plural: string) {
	return count === 1 ? singular : plural;
}
