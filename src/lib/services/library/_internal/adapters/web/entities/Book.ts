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
			title: row[1],
			sort: row[2],
			timestamp: row[3],
			pubdate: row[4],
			series_index: row[5],
			path: row[9],
			flags: row[10],
			uuid: row[11],
			has_cover: row[12],
			last_modified: row[13],
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
