import { F7SidebarLeft } from "@/components/icons/F7SidebarLeft";
import { AddBookButton } from "@/components/organisms/AddBook";
import { LibraryToolbarControls } from "@/components/organisms/Toolbar";
import { SettingsModal } from "@/components/organisms/SettingsModal";
import { Sidebar } from "@/components/organisms/Sidebar";
import { SettingsModalProvider } from "@/lib/contexts/modal-settings/Provider";
import { ActionIcon, AppShell, Burger, Group } from "@mantine/core";
import { useDisclosure } from "@mantine/hooks";
import { Outlet, createRootRoute } from "@tanstack/react-router";

const Root = () => {
	const [mobileOpened, { toggle: toggleMobile }] = useDisclosure(false);
	const [desktopOpened, { toggle: toggleDesktop }] = useDisclosure(true);

	return (
		<AppShell
			padding="md"
			header={{ height: 44 }}
			navbar={{
				width: 248,
				breakpoint: "sm",
				collapsed: { mobile: !mobileOpened, desktop: !desktopOpened },
			}}
			h={"100vh"}
			style={{
				overflowY: "scroll",
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
			<AppShell.Header data-tauri-drag-region>
				<Group
					h="100%"
					px="md"
					pl={"75px"}
					justify="space-between"
					wrap="nowrap"
					data-tauri-drag-region
					style={{
						backgroundColor: "var(--ctd-header-bg)",
						backdropFilter: "blur(3px)",
						borderBottom: "1px solid var(--ctd-border)",
					}}
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
				p="md"
				style={{
					backgroundColor: "var(--ctd-nav-bg)",
					borderRight: "1px solid var(--ctd-border)",
				}}
			>
				<Sidebar />
			</AppShell.Navbar>

			<AppShell.Main
				style={{
					display: "grid",
					gridTemplateRows: "1fr",
					background: "var(--ctd-main-gradient)",
				}}
			>
				<Outlet />
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
