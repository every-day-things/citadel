import { F7SidebarLeft } from "@/components/icons/F7SidebarLeft";
import { AddBookButton } from "@/components/organisms/AddBook";
import { Sidebar } from "@/components/organisms/Sidebar";
import { useNativeThemeSync } from "@/lib/hooks/use-native-theme-sync";
import { ActionIcon, AppShell, Burger, Group } from "@mantine/core";
import { useDisclosure } from "@mantine/hooks";
import { Outlet, createRootRoute, useRouterState } from "@tanstack/react-router";

const Root = () => {
	const [mobileOpened, { toggle: toggleMobile }] = useDisclosure(false);
	const [desktopOpened, { toggle: toggleDesktop }] = useDisclosure(true);
	const { location } = useRouterState();
	useNativeThemeSync();

	// The settings window loads /settings in its own webview; it brings its
	// own full-window layout and must not inherit the library chrome
	// (toolbar, sidebar, Add Book).
	if (location.pathname.startsWith("/settings")) {
		return <Outlet />;
	}

	return (
		<AppShell
			padding={0}
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
					pl={"110px"}
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
				</Group>
			</AppShell.Header>

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
				{/*
				 * Flush content region, separated from the glass chrome by
				 * hairlines only (Finder/Mail style). This div is the app's
				 * scroll container; sticky headers/status bars pin to it.
				 */}
				<div
					style={{
						minHeight: 0,
						overflowY: "auto",
						background: "var(--ctd-content-bg)",
						borderTop: "1px solid var(--ctd-border)",
						borderLeft: "1px solid var(--ctd-border)",
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
		<MainPure
			toggleDesktop={toggleDesktop}
			isSidebarOpenMobile={isSidebarOpenMobile}
			toggleMobile={toggleMobile}
		/>
	);
};

export const Route = createRootRoute({
	component: Root,
});
