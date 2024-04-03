import { promptToAddBook } from "$lib/library/addBook";
import { Library } from "@/lib/library/_types";

export async function beginAddBookHandler(library: Library) {
	return promptToAddBook(library);
}

export function pluralize(count: number, singular: string, plural: string) {
	return count === 1 ? singular : plural;
}
