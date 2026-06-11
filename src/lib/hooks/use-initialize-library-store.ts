import { useEffect } from "react";
import { useLibraryStore } from "@/stores/library/store";
import { useActiveLibraryPath } from "@/stores/settings/store";

/**
 * Initializes the library store when the active library path changes.
 * This hook should be called once at the app root level.
 */
export const useInitializeLibraryStore = () => {
	const libraryPath = useActiveLibraryPath();
	const actions = useLibraryStore((state) => state.actions);

	useEffect(() => {
		if (libraryPath.isSome) {
			void actions.initialize(libraryPath.value);
		} else {
			actions.reset();
		}
	}, [libraryPath, actions]);
};
