import { AuthorId } from "../types";

export interface Author {
	id: AuthorId;
	name: string;
}

export const Author = {
	fromRow: (row: any[]): Author => {
		return {
			id: row[0].toString() as AuthorId,
			name: row[1],
		};
	},
};
