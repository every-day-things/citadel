import { useSettings } from "./store";

export const setActiveLibrary = async (libraryId: string): Promise<void> => {
    await useSettings.getState().set("activeLibraryId", libraryId);
};

// Library management actions
export const createLibrary = async (absolutePath: string): Promise<string> => {
	const libraryId = uuidv4();
	const displayName = absolutePath.split("/").at(-1) ?? "";
	const { libraryPaths } = useSettings.getState();

	const wouldBeDuplicate = libraryPaths.find(
		(library) => library.absolutePath === absolutePath,
	);

	if (wouldBeDuplicate) {
		return wouldBeDuplicate.id;
	}

	await useSettings.getState().set("libraryPaths", [
		...libraryPaths,
		{
			id: libraryId,
			displayName,
			absolutePath,
		},
	]);

	return libraryId;
};

// TODO: Replace this with a proper UUID generator
const uuidv4 = () => {
	return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, (c) => {
		const r = (Math.random() * 16) | 0;
		const v = c === "x" ? r : (r & 0x3) | 0x8;
		return v.toString(16);
	});
};
