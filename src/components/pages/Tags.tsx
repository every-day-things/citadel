import { useEffect } from "react";

import { NamedCountList } from "@/components/organisms/NamedCountList";
import {
	useLibraryActions,
	useLibraryReady,
	useTagSummaries,
	useTagSummariesLoading,
} from "@/stores/library/store";

const TAG_NOUN = ["tag", "tags"] as const;

export const Tags = () => {
	// Loaded on first visit (clb_query_list_tag_summaries), sorted by name
	// with book counts, and refreshed by the store after mutations.
	const tags = useTagSummaries();
	const loading = useTagSummariesLoading();
	const { loadTagSummaries } = useLibraryActions();
	const libraryReady = useLibraryReady();

	// Waits for the library: on a cold start this page can mount before the
	// library opens, and the store's loader is a no-op until then.
	useEffect(() => {
		if (libraryReady && tags === null && !loading) void loadTagSummaries();
	}, [libraryReady, tags, loading, loadTagSummaries]);

	if (tags === null) {
		return null;
	}

	return (
		<NamedCountList
			items={tags}
			kind="tags"
			noun={TAG_NOUN}
			toSearch={(tag) => ({ tag_id: tag.id })}
		/>
	);
};
