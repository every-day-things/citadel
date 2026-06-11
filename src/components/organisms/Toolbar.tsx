import { F7ListBullet } from "@/components/icons/F7ListBullet";
import { F7SquareGrid2x2 } from "@/components/icons/F7SquareGrid2x2";
import {
	IconButton,
	SearchField,
	SegmentedControl,
	Select,
	Tooltip,
} from "@/components/ui";
import { librarySortOptions } from "@/lib/library-sort-options";
import {
	type LibraryBookSortOrderKey,
	useLibraryView,
} from "@/stores/library-view/store";
import { useRouterState } from "@tanstack/react-router";

export const LibraryToolbarControls = () => {
	const { location } = useRouterState();
	const query = useLibraryView((s) => s.query);
	const sortOrder = useLibraryView((s) => s.sortOrder);
	const view = useLibraryView((s) => s.view);
	const hideRead = useLibraryView((s) => s.hideRead);
	const setQuery = useLibraryView((s) => s.setQuery);
	const setSortOrder = useLibraryView((s) => s.setSortOrder);
	const setView = useLibraryView((s) => s.setView);
	const setHideRead = useLibraryView((s) => s.setHideRead);

	if (location.pathname !== "/") {
		return null;
	}

	return (
		<div
			style={{
				display: "flex",
				alignItems: "center",
				gap: 8,
				flexWrap: "nowrap",
			}}
			data-tauri-drag-region
		>
			<SegmentedControl
				aria-label="Library view"
				items={[
					{
						value: "covers",
						label: <F7SquareGrid2x2 />,
						"aria-label": "Covers view",
					},
					{
						value: "list",
						label: <F7ListBullet />,
						"aria-label": "List view",
					},
				]}
				value={view}
				onChange={(value) => setView(value as "covers" | "list")}
			/>
			<Select
				width={150}
				aria-label="Sort order"
				options={librarySortOptions}
				value={sortOrder}
				onChange={(value) => setSortOrder(value as LibraryBookSortOrderKey)}
			/>
			<Tooltip label={hideRead ? "Show read books" : "Hide read books"}>
				<IconButton
					active={hideRead}
					aria-label={hideRead ? "Show read books" : "Hide read books"}
					aria-pressed={hideRead}
					onClick={() => setHideRead(!hideRead)}
				>
					<svg
						width="15"
						height="15"
						viewBox="0 0 15 15"
						fill="none"
						aria-hidden="true"
					>
						<path
							d="M1.5 7.5S3.7 3.5 7.5 3.5s6 4 6 4-2.2 4-6 4-6-4-6-4Z"
							stroke="currentColor"
							strokeWidth="1.2"
						/>
						<circle
							cx="7.5"
							cy="7.5"
							r="1.8"
							stroke="currentColor"
							strokeWidth="1.2"
						/>
						{hideRead && (
							<path
								d="M2.5 12.5l10-10"
								stroke="currentColor"
								strokeWidth="1.2"
								strokeLinecap="round"
							/>
						)}
					</svg>
				</IconButton>
			</Tooltip>
			<SearchField
				placeholder="Search"
				aria-label="Search book titles and authors"
				value={query}
				onChange={(event) => setQuery(event.currentTarget.value)}
				style={{ width: 210 }}
			/>
		</div>
	);
};
