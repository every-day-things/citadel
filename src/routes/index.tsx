import { createFileRoute, useSearch } from "@tanstack/react-router";
import { Books } from "@/components/pages/Books";

interface BookSearch {
	search_for_author?: string;
	search_for_series?: string;
}

export const Route = createFileRoute("/")({
	component: Index,
	validateSearch: (search: Record<string, unknown>): BookSearch => {
		// validate and parse the search params into a typed state
		return {
			search_for_author: (search.search_for_author as string) ?? undefined,
			search_for_series: (search.search_for_series as string) ?? undefined,
		};
	},
});

function Index() {
	const { search_for_author, search_for_series } = useSearch({ from: "/" });
	return (
		<Books
			search_for_author={search_for_author}
			search_for_series={search_for_series}
		/>
	);
}
