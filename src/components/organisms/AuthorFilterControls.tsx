import { Flex, TextInput, Select, Switch } from "@mantine/core";
import {
	AuthorSortOrderValue,
	UseAuthorFiltersReturn,
	sortOrderOptions,
} from "@/lib/hooks/use-author-filters";

interface AuthorFilterControlsProps {
	filters: UseAuthorFiltersReturn["filters"];
	onSearchChange: (term: string) => void;
	onSortOrderChange: (order: AuthorSortOrderValue) => void;
	onShowOnlyAuthorsWithoutBooksChange: (show: boolean) => void;
}

export const AuthorFilterControls = ({
	filters,
	onSearchChange,
	onSortOrderChange,
	onShowOnlyAuthorsWithoutBooksChange,
}: AuthorFilterControlsProps) => {
	return (
		<Flex
			mih={50}
			gap="sm"
			miw={100}
			justify="space-between"
			align="center"
			direction="row"
			wrap="wrap"
		>
			<TextInput
				miw="32ch"
				placeholder="Search authors"
				value={filters.searchTerm}
				onChange={(event) => onSearchChange(event.currentTarget.value)}
			/>

			<Select
				placeholder="Sort Order"
				allowDeselect={false}
				w={150}
				value={filters.sortOrder}
				onChange={(value) => onSortOrderChange(value as AuthorSortOrderValue)}
				data={sortOrderOptions}
			/>

			<Switch
				label="No books"
				checked={filters.showOnlyAuthorsWithoutBooks}
				onChange={(event) =>
					onShowOnlyAuthorsWithoutBooksChange(event.currentTarget.checked)
				}
			/>
		</Flex>
	);
};
