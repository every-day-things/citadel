import initSqlJs, { Database } from "sql.js";

import { LibraryBook } from "@/bindings";

import { Library, WebConnectionOptions } from "../_types";

const libraryBook = {
	fromRow: (row: any[]): LibraryBook => {
		return {
			id: row[0]?.toString() ?? "",
			title: row[1]?.toString() ?? "",
			author_list: [
				{
					sortable_name: "",
					name: "",
					id: "",
				},
			],
			uuid: null,
			sortable_title: "",
			author_sort_lookup: {},
			file_list: [],
			cover_image: null,
			identifier_list: [],
		};
	},
};

export const genWebCalibreClient = async (
	options: WebConnectionOptions,
): Promise<Library> => {
	const SQL = await initSqlJs({
		// TODO: Now Citadel requires being online on the web? ... that is probably fine, yes.
		locateFile: (file: string) => `https://sql.js.org/dist/${file}`,
	});
	const loadDb = async (): Promise<Database> => {
		const fileBuffer = await (
			await (
				await options.libraryDirectoryHandle.getFileHandle("metadata.db", {
					create: false,
				})
			).getFile()
		).arrayBuffer();

		const db = new SQL.Database(new Uint8Array(fileBuffer));

		return db;
	};

	return {
		listBooks: async () => {
			const db = await loadDb();
			const res = db.exec("SELECT * FROM 'books'");
			if (res.length === 0) {
				return [];
			}
			const rows = res[0].values;

			const coverImagePromises = rows.map((row) => {
				const path = row[9].toString();
				if (path === "") {
					return null;
				}
				return coverImageFromPath(path, options.libraryDirectoryHandle);
			});
			const coverImages = await Promise.all(coverImagePromises);

			const books = rows
				.map((row) => libraryBook.fromRow(row))
				.map((book, index): LibraryBook => {
					const coverImage = coverImages[index];
					if (coverImage === null) {
						return book;
					}

					return {
						...book,
						cover_image: {
							kind: "Remote",
							url: URL.createObjectURL(coverImage),
							local_path: null,
						},
					};
				});
			return books;
		},
	} as unknown as Library;
};

const coverImageFromPath = async (
	path: string,
	libraryDirectoryHandle: FileSystemDirectoryHandle,
): Promise<File | null> => {
	const parts = path.split("/");
	const maxDepth = parts.length;
	let currDepth = 0;
	let handle: FileSystemDirectoryHandle | FileSystemFileHandle | null =
		libraryDirectoryHandle;

	while (currDepth < maxDepth) {
		try {
			// File names can be invalid, which throws an error.
			handle = await handle.getDirectoryHandle(parts[currDepth]);
		} catch (e) {
			console.log(e, handle, parts[currDepth], parts, currDepth);
			handle = null;
			break;
		}
		if (handle === null) {
			break;
		}
		currDepth++;
	}

	if (handle === null) {
		return null;
	}
	try {
		// Getting the cover image can throw errors
		const fileHandle = await handle.getFileHandle("cover.jpg");
		return fileHandle.getFile();
	} catch (e) {
		return null;
	}
};
