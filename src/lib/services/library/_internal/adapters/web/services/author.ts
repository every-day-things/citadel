import { AuthorRepository } from "../repositories/Repository";
import { Author } from "../entities/Author";

export const createAuthorService = (authorRepository: AuthorRepository) => {
	return {
		all: async (): Promise<Author[]> => {
			return await authorRepository.all();
		},
	};
};
