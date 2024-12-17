import { Books } from "@/components/pages/Books";
import { createFileRoute, useSearch } from "@tanstack/react-router";

type BookSearch = {
	search_for_author?: string;
};

export const Route = createFileRoute("/")({
	component: Index,
	validateSearch: (search: Record<string, unknown>): BookSearch => {
		// validate and parse the search params into a typed state
		return {
			search_for_author: (search.search_for_author as string) ?? undefined,
		};
	},
});

function Index() {
	const { search_for_author } = useSearch({from: "/"});
	return <Books search_for_author={search_for_author} />;
}
