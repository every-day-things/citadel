import { F7Gear } from "@/components/icons/F7Gear";
import { useSettingsModal } from "@/lib/contexts/modal-settings/hooks";
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
import { Link, useRouterState } from "@tanstack/react-router";
import { useMemo } from "react";

export const Sidebar = () => {
	const state = useLibraryState();
	const { location } = useRouterState();
	const { open: openSettings } = useSettingsModal();

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
				openSettings={() => openSettings()}
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
	const hoverBackground = "var(--ctd-nav-hover-bg)";
	const activeBackground = "var(--ctd-nav-active-bg)";
	const activeTextColor = "var(--ctd-nav-active-text)";

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
						styles={{
							root: {
								borderRadius: "0.375rem",
								padding: "0.4rem 0.65rem",
								transition: "background-color 140ms ease, color 140ms ease",
								backgroundColor: isActive() ? activeBackground : "transparent",
								color: isActive() ? activeTextColor : baseTextColor,
								"&:hover": {
									backgroundColor: hoverBackground,
								},
								"&[data-active]": {
									backgroundColor: activeBackground,
									color: activeTextColor,
								},
								"&[data-active]:hover": {
									backgroundColor: activeBackground,
								},
							},
						}}
					/>
				))}
				<NavLink
					label="Authors"
					component={Link}
					to="/authors"
					active={currentPathname === "/authors"}
					variant="subtle"
					styles={{
						root: {
							borderRadius: "0.375rem",
							padding: "0.4rem 0.65rem",
							transition: "background-color 140ms ease, color 140ms ease",
							backgroundColor:
								currentPathname === "/authors"
									? activeBackground
									: "transparent",
							color:
								currentPathname === "/authors"
									? activeTextColor
									: baseTextColor,
							"&:hover": {
								backgroundColor: hoverBackground,
							},
							"&[data-active]": {
								backgroundColor: activeBackground,
								color: activeTextColor,
							},
							"&[data-active]:hover": {
								backgroundColor: activeBackground,
							},
						},
					}}
				/>
			</Stack>
			<Stack>
				<ActionIcon
					color={"text"}
					aria-label="Settings"
					size={"sm"}
					onClick={openSettings}
				>
					<F7Gear style={{ color: "var(--mantine-color-text)" }} />
				</ActionIcon>
			</Stack>
		</Stack>
	);
};
