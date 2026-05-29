import { F7SidebarLeft } from "@/components/icons/F7SidebarLeft";
import { HardcoverSettingsModal } from "@/components/organisms/HardcoverSettingsModal";
import { LibrarySelectModal } from "@/components/organisms/LibrarySelectModal";
import { Sidebar } from "@/components/organisms/Sidebar";
import { ThemeModal } from "@/components/organisms/ThemeModal";
import { HardcoverModalProvider } from "@/lib/contexts/modal-hardcover/Provider";
import { LibrarySelectModalProvider } from "@/lib/contexts/modal-library-select/Provider";
import { ThemeModalProvider } from "@/lib/contexts/modal-theme/Provider";
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
					data-tauri-drag-region
					style={{
						backgroundColor: "var(--ctd-header-bg)",
						backdropFilter: "blur(3px)",
						borderBottom: "1px solid var(--ctd-border)",
					}}
				>
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
				</Group>
			</AppShell.Header>

			<ThemeModal />
			<LibrarySelectModal />
			<HardcoverSettingsModal />

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
		<ThemeModalProvider>
			<LibrarySelectModalProvider>
				<HardcoverModalProvider>
					<MainPure
						toggleDesktop={toggleDesktop}
						isSidebarOpenMobile={isSidebarOpenMobile}
						toggleMobile={toggleMobile}
					/>
				</HardcoverModalProvider>
			</LibrarySelectModalProvider>
		</ThemeModalProvider>
	);
};

export const Route = createRootRoute({
	component: Root,
});
