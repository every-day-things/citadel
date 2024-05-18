import { BookId } from "../types";

export interface Book {
	id: BookId;
	uuid?: string;
	title: string;
	sort?: string;
	timestamp?: Date;
	pubdate?: Date;
	series_index: number;
	author_sort?: string;
	path: string;
	flags: number;
	has_cover?: boolean;
	last_modified: Date;
}

export const Book = {
	fromRow: (row: any[]): Book => {
		return {
			id: row[0].toString() as BookId,
			uuid: row[1],
			title: row[2],
			sort: row[3],
			timestamp: row[4],
			pubdate: row[5],
			series_index: row[6],
			author_sort: row[7],
			path: row[8],
			flags: row[9],
			has_cover: row[10],
			last_modified: row[11],
		};
	},
	toRow: (book: Book): any[] => {
		return [
			Number(book.id),
			book.uuid,
			book.title,
			book.sort,
			book.timestamp,
			book.pubdate,
			book.series_index,
			book.author_sort,
			book.path,
			book.flags,
			book.has_cover,
			book.last_modified,
		];
	},
};
