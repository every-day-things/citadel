import { useEffect } from "react";

import { useActiveLibraryPath } from "@/stores/settings/store";
import { useLibraryStore } from "@/stores/library/store";

/**
 * Initializes the library store when the active library path changes.
 * This hook should be called once at the app root level.
 */
export const useInitializeLibraryStore = () => {
	const libraryPath = useActiveLibraryPath();
	const initialize = useLibraryStore((state) => state.initialize);
	const reset = useLibraryStore((state) => state.reset);

	useEffect(() => {
		if (libraryPath.isSome) {
			void initialize(libraryPath.value);
		} else {
			reset();
		}
	}, [libraryPath, initialize, reset]);
};
