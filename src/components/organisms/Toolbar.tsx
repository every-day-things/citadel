import { F7ListBullet } from "@/components/icons/F7ListBullet";
import { F7SquareGrid2x2 } from "@/components/icons/F7SquareGrid2x2";
import {
	LibraryBookSortOrder,
	type LibraryBookSortOrderKey,
	useLibraryView,
} from "@/stores/library-view/store";
import {
	ActionIcon,
	Center,
	Group,
	SegmentedControl,
	Select,
	TextInput,
	Tooltip,
} from "@mantine/core";
import { useRouterState } from "@tanstack/react-router";

const SORT_LABELS: Record<LibraryBookSortOrderKey, string> = {
	nameAz: "Name (A–Z)",
	nameZa: "Name (Z–A)",
	authorAz: "Author (A–Z)",
	authorZa: "Author (Z–A)",
};

const controlStyles = {
	input: {
		backgroundColor: "var(--ctd-control-bg)",
		borderColor: "var(--ctd-border)",
		color: "var(--ctd-control-text)",
	},
};

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
			<Select
				size="xs"
				w={150}
				radius="sm"
				allowDeselect={false}
				aria-label="Sort order"
				data={(
					Object.keys(LibraryBookSortOrder) as LibraryBookSortOrderKey[]
				).map((key) => ({
					value: key,
					label: SORT_LABELS[key],
				}))}
				value={sortOrder}
				onChange={(value) =>
					value && setSortOrder(value as LibraryBookSortOrderKey)
				}
				styles={{
					...controlStyles,
					dropdown: {
						backgroundColor: "var(--ctd-surface-strong)",
						borderColor: "var(--ctd-border)",
					},
				}}
			/>
			<Tooltip label={hideRead ? "Show read books" : "Hide read books"}>
				<ActionIcon
					variant={hideRead ? "light" : "subtle"}
					color={hideRead ? "accent" : "gray"}
					aria-label={hideRead ? "Show read books" : "Hide read books"}
					aria-pressed={hideRead}
					onClick={() => setHideRead(!hideRead)}
					style={hideRead ? undefined : { color: "var(--ctd-ink-soft)" }}
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
				</ActionIcon>
			</Tooltip>
			<TextInput
				size="xs"
				w={210}
				radius="xl"
				placeholder="Search"
				aria-label="Search book titles and authors"
				value={query}
				onChange={(event) => setQuery(event.currentTarget.value)}
				leftSection={
					<svg
						width="12"
						height="12"
						viewBox="0 0 15 15"
						fill="none"
						aria-hidden="true"
					>
						<circle
							cx="6.5"
							cy="6.5"
							r="4.5"
							stroke="currentColor"
							strokeWidth="1.4"
						/>
						<path
							d="M10 10l3.5 3.5"
							stroke="currentColor"
							strokeWidth="1.4"
							strokeLinecap="round"
						/>
					</svg>
				}
				styles={{
					input: {
						...controlStyles.input,
						// Toolbar search fields are capsules in macOS; keep the
						// global 6px radius for in-content fields only.
						borderRadius: 13,
					},
					section: { color: "var(--ctd-ink-soft)" },
				}}
			/>
		</Group>
	);
};
