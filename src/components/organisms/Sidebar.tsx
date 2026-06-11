import { Link, useNavigate, useRouterState } from "@tanstack/react-router";
import { isTauri } from "@tauri-apps/api/core";
import clsx from "clsx";
import { useCallback, useMemo } from "react";
import { commands } from "@/bindings";
import { F7Gear } from "@/components/icons/F7Gear";
import { AlertDialog, IconButton } from "@/components/ui";
import { useAppUpdates } from "@/lib/hooks/use-app-updates";
import { LibraryState, useLibraryState } from "@/stores/library/store";
import styles from "./Sidebar.module.css";

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
			<AlertDialog
				open={isUpdatePromptOpen}
				onOpenChange={(open) => {
					// The old modal disabled escape/outside-click closes while the
					// update was installing; keep the prompt open in that state.
					// Read the flag from the store so the Action click (which sets
					// it synchronously before Radix requests the close) is seen.
					if (!open && !useAppUpdates.getState().isInstallingUpdate) {
						closeUpdatePrompt();
					}
				}}
				title="Update available"
				description="A new Citadel release is available. Install now?"
				confirmLabel={
					isInstallingUpdate ? "Installing…" : "Install and restart"
				}
				cancelLabel="Later"
				onConfirm={() => void installAvailableUpdate()}
			/>
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
	return (
		<div className={styles.root}>
			<div className={styles.section}>
				<h2 className={styles.sectionLabel}>Library</h2>
				{shelves.map(({ title, path, isActive }) => (
					<Link
						key={path}
						to={path}
						className={clsx("ctd-nav-link", styles.navLink)}
						data-active={isActive() || undefined}
					>
						{title}
					</Link>
				))}
				<Link
					to="/authors"
					className={clsx("ctd-nav-link", styles.navLink)}
					data-active={currentPathname === "/authors" || undefined}
				>
					Authors
				</Link>
			</div>
			<div className={styles.section}>
				<IconButton
					aria-label="Settings"
					className={clsx("ctd-settings-button", styles.settingsButton)}
					onClick={openSettings}
				>
					{/* F7Gear hardcodes width/height 56; size it to fit the button. */}
					<F7Gear width={18} height={18} />
				</IconButton>
			</div>
		</div>
	);
};
