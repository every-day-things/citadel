import { Flex, TextInput, Select, Switch } from "@mantine/core";
import {
	type AuthorSortOrderValue,
	type UseAuthorFiltersReturn,
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
			gap="sm"
			miw={100}
			w="100%"
			justify="space-between"
			align="center"
			direction="row"
			wrap="wrap"
		>
			<TextInput
				size="xs"
				miw="28ch"
				placeholder="Search authors"
				styles={{
					input: {
						backgroundColor: "var(--ctd-control-bg)",
						borderColor: "var(--ctd-border)",
						color: "var(--ctd-control-text)",
					},
				}}
				value={filters.searchTerm}
				onChange={(event) => onSearchChange(event.currentTarget.value)}
			/>

			<Select
				size="xs"
				placeholder="Sort Order"
				allowDeselect={false}
				w={150}
				styles={{
					input: {
						backgroundColor: "var(--ctd-control-bg)",
						borderColor: "var(--ctd-border)",
						color: "var(--ctd-control-text)",
					},
					dropdown: {
						backgroundColor: "var(--ctd-surface-strong)",
						borderColor: "var(--ctd-border)",
					},
				}}
				value={filters.sortOrder}
				onChange={(value) => onSortOrderChange(value as AuthorSortOrderValue)}
				data={sortOrderOptions}
			/>

			<Switch
				size="xs"
				label="Without books"
				color="accent"
				styles={{
					label: {
						fontWeight: 600,
						color: "var(--ctd-ink-soft)",
					},
					track: {
						borderColor: "var(--ctd-border-strong)",
						backgroundColor: "var(--ctd-control-bg)",
					},
					thumb: {
						borderColor: "var(--ctd-border-strong)",
					},
				}}
				checked={filters.showOnlyAuthorsWithoutBooks}
				onChange={(event) =>
					onShowOnlyAuthorsWithoutBooksChange(event.currentTarget.checked)
				}
			/>
		</Flex>
	);
};
