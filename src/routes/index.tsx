import { createFileRoute, useSearch } from "@tanstack/react-router";
import { Books } from "@/components/pages/Books";

interface BookSearch {
	/** Only books by this author (LibraryAuthor id). */
	author_id?: string;
	/** Only books in this series (LibrarySeries id). */
	series_id?: number;
}

export const Route = createFileRoute("/")({
	component: Index,
	validateSearch: (search: Record<string, unknown>): BookSearch => {
		// validate and parse the search params into a typed state
		const seriesId = Number(search.series_id);
		return {
			author_id:
				typeof search.author_id === "string" ? search.author_id : undefined,
			series_id: Number.isInteger(seriesId) ? seriesId : undefined,
		};
	},
});

function Index() {
	const { author_id, series_id } = useSearch({ from: "/" });
	return <Books author_id={author_id} series_id={series_id} />;
}
