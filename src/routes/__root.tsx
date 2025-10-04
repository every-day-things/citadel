import { F7SidebarLeft } from "@/components/icons/F7SidebarLeft";
import { LibrarySelectModal } from "@/components/organisms/LibrarySelectModal";
import { Sidebar } from "@/components/organisms/Sidebar";
import { ThemeModal } from "@/components/organisms/ThemeModal";
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
			header={{ height: 36 }}
			navbar={{
				width: 200,
				breakpoint: "sm",
				collapsed: { mobile: !mobileOpened, desktop: !desktopOpened },
			}}
			h={"100vh"}
			style={{ overflowY: "scroll" }}
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

			<AppShell.Navbar p="md">
				<Sidebar />
			</AppShell.Navbar>

			<AppShell.Main
				style={{
					display: "grid",
					gridTemplateRows: "1fr",
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
		<>
			<ThemeModalProvider>
				<LibrarySelectModalProvider>
					<MainPure
						toggleDesktop={toggleDesktop}
						isSidebarOpenMobile={isSidebarOpenMobile}
						toggleMobile={toggleMobile}
					/>
				</LibrarySelectModalProvider>
			</ThemeModalProvider>
		</>
	);
};

export const Route = createRootRoute({
	component: Root,
});
