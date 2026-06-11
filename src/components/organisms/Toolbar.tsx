import { F7ListBullet } from "@/components/icons/F7ListBullet";
import { F7SquareGrid2x2 } from "@/components/icons/F7SquareGrid2x2";
import { useLibraryView } from "@/stores/library-view/store";
import { Center, Group, SegmentedControl } from "@mantine/core";
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
		<Group gap="xs" wrap="nowrap" data-tauri-drag-region>
			<SegmentedControl
				size="xs"
				radius="sm"
				data={[
					{
						value: "covers",
						label: (
							<Center>
								<F7SquareGrid2x2 />
							</Center>
						),
					},
					{
						value: "list",
						label: (
							<Center>
								<F7ListBullet />
							</Center>
						),
					},
				]}
				value={view}
				onChange={(value) => setView(value as "covers" | "list")}
				styles={{
					root: {
						backgroundColor: "var(--ctd-segmented-root-bg)",
						border: "1px solid var(--ctd-border)",
					},
					indicator: {
						backgroundColor: "var(--ctd-segmented-indicator-bg)",
					},
					label: {
						color: "var(--ctd-segmented-label)",
					},
				}}
			/>
		</Group>
	);
};
