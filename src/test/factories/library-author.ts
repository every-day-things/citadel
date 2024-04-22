import { LibraryAuthor } from "@/bindings";
import { faker } from "@faker-js/faker";

type LibraryAuthorCreationOptions = Partial<Omit<LibraryAuthor, "id">>;

const naïveSortableName = (firstName: string, lastName: string) => {
	return `${lastName}, ${firstName}`;
};

export const LibraryAuthorFactory = (
	opts: LibraryAuthorCreationOptions,
): LibraryAuthor => {
	const first = faker.person.firstName();
	const last = faker.person.lastName();
	const name = `${first} ${last}`;
	const sortable_name = naïveSortableName(first, last);

	return {
		id: faker.string.uuid(),
		name,
		sortable_name,
		...opts,
	};
};
