import { commands } from "@/bindings";
import { F7Gear } from "@/components/icons/F7Gear";
import { useAppUpdates } from "@/lib/hooks/use-app-updates";
import { LibraryState, useLibraryState } from "@/stores/library/store";
import {
	ActionIcon,
	Button,
	Group,
	Modal,
	NavLink,
	Stack,
	Text,
} from "@mantine/core";
import { Link, useNavigate, useRouterState } from "@tanstack/react-router";
import { isTauri } from "@tauri-apps/api/core";
import { type CSSProperties, useCallback, useMemo } from "react";

export const Sidebar = () => {
	const state = useLibraryState();
	const { location } = useRouterState();
	const navigate = useNavigate();

	// Settings live in their own window; the Rust command owns the window
	// options and focuses the existing window if one is already open.
	const openSettings = useCallback(() => {
		if (isTauri()) {
			void commands.clbCmdOpenSettings();
		} else {
			void navigate({ to: "/settings" });
		}
	}, [navigate]);

	const isUpdatePromptOpen = useAppUpdates((s) => s.isUpdatePromptOpen);
	const isInstallingUpdate = useAppUpdates((s) => s.isInstallingUpdate);
	const closeUpdatePrompt = useAppUpdates((s) => s.closeUpdatePrompt);
	const installAvailableUpdate = useAppUpdates((s) => s.installAvailableUpdate);

	const shelves = useMemo(() => {
		return [
			{
				title: "All Books",
				path: "/",
				isActive: () => location.pathname === "/",
			},
		];
	}, [location]);

	if (state !== LibraryState.ready) {
		return null;
	}

	return (
		<>
			<Modal
				opened={isUpdatePromptOpen}
				onClose={closeUpdatePrompt}
				title="Update available"
				centered
				closeOnClickOutside={!isInstallingUpdate}
				closeOnEscape={!isInstallingUpdate}
				withCloseButton={!isInstallingUpdate}
			>
				<Stack gap="md">
					<Text size="sm">
						A new Citadel release is available. Install now?
					</Text>
					<Group justify="flex-end">
						<Button
							variant="default"
							onClick={closeUpdatePrompt}
							disabled={isInstallingUpdate}
						>
							Later
						</Button>
						<Button
							onClick={() => void installAvailableUpdate()}
							loading={isInstallingUpdate}
						>
							Install and restart
						</Button>
					</Group>
				</Stack>
			</Modal>
			<SidebarPure
				currentPathname={location.pathname}
				shelves={shelves}
				openSettings={openSettings}
			/>
		</>
	);
};

interface SidebarPureProps {
	currentPathname: string;
	shelves: {
		title: string;
		path: string;
		isActive: () => boolean;
	}[];
	openSettings: () => void;
}

const SidebarPure = ({
	currentPathname,
	shelves,
	openSettings,
}: SidebarPureProps) => {
	const baseTextColor = "var(--ctd-ink-soft)";
	const activeBackground = "var(--ctd-nav-active-bg)";
	const activeTextColor = "var(--ctd-nav-active-text)";

	// Hover backgrounds live in styles.css (.ctd-nav-link / .ctd-settings-button):
	// pseudo-class selectors in the Mantine `styles` prop are inert inline styles,
	// so hover state must come from a real stylesheet. Inactive rows leave
	// backgroundColor unset so the CSS :hover rule can apply.
	const navLinkRootStyle = (active: boolean): CSSProperties => ({
		borderRadius: "0.375rem",
		padding: "0.4rem 0.65rem",
		minHeight: 34,
		transition: "background-color 140ms ease, color 140ms ease",
		backgroundColor: active ? activeBackground : undefined,
		color: active ? activeTextColor : baseTextColor,
	});

	return (
		<Stack
			justify="space-between"
			h="100%"
			p="md"
			style={{
				paddingTop: "1rem",
			}}
		>
			<Stack gap={2}>
				<Text
					component="h2"
					size="xs"
					fw={600}
					tt="uppercase"
					style={{
						/* Aligns with NavLink label text (0.65rem item inset); the extra
						   bottom margin separates the header from its rows without making
						   the row rhythm itself any looser. */
						margin: "0 0 4px",
						paddingInline: "0.65rem",
						letterSpacing: "0.05em",
						color: "var(--ctd-ink-soft)",
					}}
				>
					Library
				</Text>
				{shelves.map(({ title, path, isActive }) => (
					<NavLink
						key={path}
						label={title}
						component={Link}
						to={path}
						active={isActive()}
						variant="subtle"
						className="ctd-nav-link"
						styles={{ root: navLinkRootStyle(isActive()) }}
					/>
				))}
				<NavLink
					label="Authors"
					component={Link}
					to="/authors"
					active={currentPathname === "/authors"}
					variant="subtle"
					className="ctd-nav-link"
					styles={{
						root: navLinkRootStyle(currentPathname === "/authors"),
					}}
				/>
			</Stack>
			<Stack>
				{/* size 28 keeps the gear's hit area comfortably clickable; hover
				    background comes from .ctd-settings-button in styles.css. */}
				<ActionIcon
					variant="subtle"
					color="gray"
					aria-label="Settings"
					size={28}
					className="ctd-settings-button"
					onClick={openSettings}
				>
					{/* F7Gear hardcodes width/height 56; size it to fit the button
					    (ActionIcon clips overflow). */}
					<F7Gear
						width={18}
						height={18}
						style={{ color: "var(--mantine-color-text)" }}
					/>
				</ActionIcon>
			</Stack>
		</Stack>
	);
};
