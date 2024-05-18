import { Database, SqlJsStatic } from "sql.js";

export const loadDb = async (
	libraryDirectoryHandle: FileSystemDirectoryHandle,
	sqlClient: SqlJsStatic,
): Promise<Database | null> => {
	try {
		const fileBuffer = await (
			await (
				await libraryDirectoryHandle.getFileHandle("metadata.db", {
					create: false,
				})
			).getFile()
		).arrayBuffer();
		return new sqlClient.Database(new Uint8Array(fileBuffer));
	} catch (e) {
		console.error(e);
		return null;
	}
};
