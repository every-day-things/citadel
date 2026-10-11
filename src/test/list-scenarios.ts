import type {
	LibraryAuthor,
	LibraryPublisher,
	LibrarySeries,
	LibraryTagSummary,
} from "@/bindings";
import { useLibraryStore } from "@/stores/library/store";

interface ExpectedListItem {
	id: string | number;
	name: string;
	book_count: number;
}

interface ListScenario {
	label: string;
	route: string;
	queryKey: string;
	search: string;
	rows: string;
	name: string;
	count: string;
	link: string;
	header: string;
	footer: string;
	rowHeight: number;
	overscan: number;
	emptyResultsHideChrome: boolean;
	createItem: (index: number, longName: boolean) => ExpectedListItem;
	install: (count: number, longName: boolean) => () => void;
}

const itemName = (prefix: string, index: number, longName: boolean) =>
	`${prefix} ${String(index).padStart(6, "0")}${longName ? " — a very long name".repeat(20) : ""}`;

const createSeries = (index: number, longName: boolean): LibrarySeries => ({
	id: index + 1,
	name: itemName("Series", index, longName),
	book_count: index % 7,
});

const createTag = (index: number, longName: boolean): LibraryTagSummary => ({
	id: index + 1,
	name: itemName("Tag", index, longName),
	book_count: index % 7,
});

const createPublisher = (
	index: number,
	longName: boolean,
): LibraryPublisher => ({
	id: index + 1,
	name: itemName("Publisher", index, longName),
	book_count: index % 7,
});

const createAuthor = (index: number, longName: boolean): LibraryAuthor => ({
	id: String(index + 1),
	name: itemName("Author", index, longName),
	sortable_name: itemName("Author", index, longName),
	book_count: index % 7,
});

const shared = {
	rows: ".ctd-author-row",
	name: "span",
	count: "a:nth-of-type(2)",
	link: "a",
	header: '[class*="headerRow"]',
	footer: '[class*="footerText"]',
	rowHeight: 40,
	overscan: 10,
	emptyResultsHideChrome: false,
};

export const listScenarios = {
	series: {
		...shared,
		label: "series",
		route: "/series",
		queryKey: "series_id",
		search: 'input[placeholder="Search series"]',
		createItem: createSeries,
		install: (count, longName) => {
			const { series, seriesLoading } = useLibraryStore.getState();
			useLibraryStore.setState({
				series: Array.from({ length: count }, (_, index) =>
					createSeries(index, longName && index === count - 1),
				),
				seriesLoading: false,
			});
			return () => useLibraryStore.setState({ series, seriesLoading });
		},
	},
	tags: {
		...shared,
		label: "tags",
		route: "/tags",
		queryKey: "tag_id",
		search: 'input[placeholder="Search tags"]',
		createItem: createTag,
		install: (count, longName) => {
			const { tagSummaries, tagSummariesLoading } = useLibraryStore.getState();
			useLibraryStore.setState({
				tagSummaries: Array.from({ length: count }, (_, index) =>
					createTag(index, longName && index === count - 1),
				),
				tagSummariesLoading: false,
			});
			return () =>
				useLibraryStore.setState({ tagSummaries, tagSummariesLoading });
		},
	},
	publishers: {
		...shared,
		label: "publishers",
		route: "/publishers",
		queryKey: "publisher_id",
		search: 'input[placeholder="Search publishers"]',
		createItem: createPublisher,
		install: (count, longName) => {
			const { publishers, publishersLoading } = useLibraryStore.getState();
			useLibraryStore.setState({
				publishers: Array.from({ length: count }, (_, index) =>
					createPublisher(index, longName && index === count - 1),
				),
				publishersLoading: false,
			});
			return () => useLibraryStore.setState({ publishers, publishersLoading });
		},
	},
	authors: {
		...shared,
		label: "authors",
		emptyResultsHideChrome: true,
		route: "/authors",
		queryKey: "author_id",
		search: 'input[placeholder="Search authors"]',
		createItem: createAuthor,
		install: (count, longName) => {
			const { authors, authorsLoading, actions } = useLibraryStore.getState();
			useLibraryStore.setState({
				authors: Array.from({ length: count }, (_, index) =>
					createAuthor(index, longName && index === count - 1),
				),
				authorsLoading: false,
				actions: {
					...actions,
					updateAuthor: async () => {
						throw new Error("Fixture editing is disabled");
					},
					deleteAuthor: async () => {
						throw new Error("Fixture editing is disabled");
					},
				},
			});
			return () =>
				useLibraryStore.setState({ authors, authorsLoading, actions });
		},
	},
} satisfies Record<string, ListScenario>;

export type ListScenarioName = keyof typeof listScenarios;

export const getListScenario = (name: string): ListScenario => {
	if (!Object.hasOwn(listScenarios, name)) {
		throw new Error(`Unknown list scenario: ${name}`);
	}
	return listScenarios[name as ListScenarioName];
};

export const describeListScenario = (scenario: ListScenario) => {
	const {
		createItem: _createItem,
		install: _install,
		...description
	} = scenario;
	return description;
};
