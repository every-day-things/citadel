import { SearchField, Select, Switch } from "@/components/ui";
import {
	type AuthorSortOrderValue,
	sortOrderOptions,
	type UseAuthorFiltersReturn,
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
		<div
			style={{
				display: "flex",
				width: "100%",
				minWidth: 100,
				justifyContent: "space-between",
				alignItems: "center",
				flexWrap: "wrap",
				gap: 12,
			}}
		>
			<SearchField
				placeholder="Search authors"
				value={filters.searchTerm}
				onChange={(event) => onSearchChange(event.currentTarget.value)}
				style={{ minWidth: "28ch" }}
			/>

			<Select
				width={150}
				aria-label="Sort order"
				placeholder="Sort Order"
				options={sortOrderOptions}
				value={filters.sortOrder}
				onChange={(value) => onSortOrderChange(value as AuthorSortOrderValue)}
			/>

			<Switch
				label="Without books"
				checked={filters.showOnlyAuthorsWithoutBooks}
				onCheckedChange={onShowOnlyAuthorsWithoutBooksChange}
			/>
		</div>
	);
};
