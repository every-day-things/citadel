import { F7ListBullet } from "@/components/icons/F7ListBullet";
import { F7SquareGrid2x2 } from "@/components/icons/F7SquareGrid2x2";
import { SegmentedControl } from "@/components/ui";
import { useLibraryView } from "@/stores/library-view/store";
import { useRouterState } from "@tanstack/react-router";

/**
 * Route-aware window-toolbar controls for the library. Only the covers/list
 * view switch lives here; search, sort, and the unread filter sit in the
 * Books page scope bar (see `pages/Books.tsx`).
 */
export const LibraryToolbarControls = () => {
	const { location } = useRouterState();
	const view = useLibraryView((s) => s.view);
	const setView = useLibraryView((s) => s.setView);

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
		</div>
	);
};
