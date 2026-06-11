import { F7SidebarLeft } from "@/components/icons/F7SidebarLeft";
import { AddBookButton } from "@/components/organisms/AddBook";
import { LibraryToolbarControls } from "@/components/organisms/Toolbar";
import { SettingsModal } from "@/components/organisms/SettingsModal";
import { Sidebar } from "@/components/organisms/Sidebar";
import { SettingsModalProvider } from "@/lib/contexts/modal-settings/Provider";
import {
	ActionIcon,
	AppShell,
	Burger,
	Group,
	useComputedColorScheme,
} from "@mantine/core";
import { useDisclosure } from "@mantine/hooks";
import { Outlet, createRootRoute } from "@tanstack/react-router";
import { isTauri } from "@tauri-apps/api/core";
import { getCurrentWindow } from "@tauri-apps/api/window";
import { useEffect } from "react";

/**
 * Keeps the native window appearance (and with it the vibrancy material
 * behind the transparent webview) in step with the in-app theme choice, so
 * forcing dark Citadel on a light desktop doesn't produce light glass behind
 * dark text.
 */
const useNativeThemeSync = () => {
	const scheme = useComputedColorScheme("light");
	useEffect(() => {
		if (!isTauri()) return;
		getCurrentWindow()
			.setTheme(scheme === "dark" ? "dark" : "light")
			.catch(() => {
				// Pre-2.x runtimes without setTheme: vibrancy follows the system.
			});
	}, [scheme]);
};

const Root = () => {
	const [mobileOpened, { toggle: toggleMobile }] = useDisclosure(false);
	const [desktopOpened, { toggle: toggleDesktop }] = useDisclosure(true);
	useNativeThemeSync();

	return (
		<AppShell
			padding={10}
			header={{ height: 46 }}
			navbar={{
				width: 248,
				breakpoint: "sm",
				collapsed: { mobile: !mobileOpened, desktop: !desktopOpened },
			}}
			h={"100vh"}
			style={{
				overflow: "hidden",
				background: "var(--ctd-shell-gradient)",
			}}
		>
			<Main
				toggleMobile={toggleMobile}
				toggleDesktop={toggleDesktop}
				isSidebarOpenMobile={mobileOpened}
			/>
		</AppShell>
	);
};

interface MainPureProps {
	isSidebarOpenMobile: boolean;
	toggleMobile: () => void;
	toggleDesktop: () => void;
}

const MainPure = ({
	toggleMobile,
	toggleDesktop,
	isSidebarOpenMobile,
}: MainPureProps) => {
	return (
		<>
			<AppShell.Header
				data-tauri-drag-region
				withBorder={false}
				style={{ backgroundColor: "var(--ctd-header-bg)" }}
			>
				<Group
					h="100%"
					px="md"
					pl={"84px"}
					justify="space-between"
					wrap="nowrap"
					data-tauri-drag-region
				>
					<Group gap="xs" wrap="nowrap" data-tauri-drag-region>
						<Burger
							opened={isSidebarOpenMobile}
							onClick={toggleMobile}
							hiddenFrom="sm"
							size="xs"
						/>
						<ActionIcon
							onClick={toggleDesktop}
							color={"text"}
							variant="transparent"
							visibleFrom="sm"
							size={"xs"}
						>
							<F7SidebarLeft title="Toggle sidebar" />
						</ActionIcon>
						<AddBookButton />
					</Group>
					<LibraryToolbarControls />
				</Group>
			</AppShell.Header>

			<SettingsModal />

			<AppShell.Navbar
				p="sm"
				withBorder={false}
				style={{ backgroundColor: "var(--ctd-nav-bg)" }}
			>
				<Sidebar />
			</AppShell.Navbar>

			<AppShell.Main
				style={{
					display: "grid",
					gridTemplateRows: "1fr",
					height: "100vh",
					background: "var(--ctd-main-gradient)",
				}}
			>
				<div
					style={{
						minHeight: 0,
						overflowY: "auto",
						background: "var(--ctd-content-bg)",
						border: "1px solid var(--ctd-border)",
						borderRadius: "var(--ctd-radius-panel)",
						boxShadow: "var(--ctd-shadow-soft)",
					}}
				>
					<Outlet />
				</div>
			</AppShell.Main>
		</>
	);
};

interface MainProps {
	toggleDesktop: () => void;
	isSidebarOpenMobile: boolean;
	toggleMobile: () => void;
}

const Main = ({
	isSidebarOpenMobile,
	toggleDesktop,
	toggleMobile,
}: MainProps) => {
	return (
		<SettingsModalProvider>
			<MainPure
				toggleDesktop={toggleDesktop}
				isSidebarOpenMobile={isSidebarOpenMobile}
				toggleMobile={toggleMobile}
			/>
		</SettingsModalProvider>
	);
};

export const Route = createRootRoute({
	component: Root,
});
