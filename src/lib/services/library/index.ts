import { initClient } from "./_internal/libraryCommsManager";
import { commitAddBook, promptToAddBook } from "./_internal/addBook";
import { DeviceType } from "./_internal/_types";
import type { Library, Options } from "./_internal/_types";

export {
	initClient,
	commitAddBook,
	promptToAddBook,
	DeviceType,
};
export type { Library, Options };
