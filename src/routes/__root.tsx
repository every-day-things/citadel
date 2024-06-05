import { F7CircleRighthalfFill } from "@/components/icons/F7CircleRightHalfFill";
import { F7MoonFill } from "@/components/icons/F7MoonFill";
import { F7SunMaxFill } from "@/components/icons/F7SunMaxFill";
import { Sidebar } from "@/components/organisms/Sidebar";
import {
	ActionIcon,
	AppShell,
	Burger,
	Button,
	Group,
	Modal,
	useMantineColorScheme,
} from "@mantine/core";
import { useDisclosure } from "@mantine/hooks";
import { Outlet, createRootRoute } from "@tanstack/react-router";
import React from "react";
import { Suspense, useMemo } from "react";

const Root = () => {
	const [mobileOpened, { toggle: toggleMobile }] = useDisclosure(false);
	const [desktopOpened, { toggle: toggleDesktop }] = useDisclosure(true);

	return (
		<>
			<AppShell
				padding="md"
				header={{ height: 60 }}
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
					isSidebarOpenDesktop={desktopOpened}
					isSidebarOpenMobile={mobileOpened}
				/>
			</AppShell>
			<Suspense>
				<RouterDevTools />
			</Suspense>
		</>
	);
};

const RouterDevTools =
  process.env.NODE_ENV === 'production'
    ? () => null // Render nothing in production
    : React.lazy(() =>
        // Lazy load in development
        import('@tanstack/router-devtools').then((res) => ({
          default: res.TanStackRouterDevtools,
          // For Embedded Mode
          // default: res.TanStackRouterDevtoolsPanel
        })),
      );

interface MainPureProps {
	isSidebarOpenMobile: boolean;
	toggleMobile: () => void;
	isSidebarOpenDesktop: boolean;
	toggleDesktop: () => void;
	isThemeSettingsOpen: boolean;
	openThemeSettings: () => void;
	closeThemeSettings: () => void;
	colorSchemeSetters: {
		dark: () => void;
		light: () => void;
		auto: () => void;
	};
}

const MainPure = ({
	toggleMobile,
	toggleDesktop,
	isSidebarOpenDesktop,
	isSidebarOpenMobile,
	openThemeSettings,
	isThemeSettingsOpen,
	closeThemeSettings,
	colorSchemeSetters,
}: MainPureProps) => {
	return (
		<>
			<AppShell.Header h={48}>
				<Group h="100%" px="md" justify="space-between">
					<Burger
						opened={isSidebarOpenMobile}
						onClick={toggleMobile}
						hiddenFrom="sm"
						size="sm"
					/>
					<Burger
						opened={isSidebarOpenDesktop}
						onClick={toggleDesktop}
						visibleFrom="sm"
						size="sm"
					/>
					<ActionIcon
						variant="default"
						aria-label="Settings"
						onClick={openThemeSettings}
					>
						<F7SunMaxFill />
					</ActionIcon>
				</Group>
			</AppShell.Header>
			<Modal
				opened={isThemeSettingsOpen}
				onClose={closeThemeSettings}
				overlayProps={{
					backgroundOpacity: 0,
				}}
				title="Choose theme"
			>
				<Group justify="space-around">
					<Button
						leftSection={<F7CircleRighthalfFill />}
						onPointerDown={colorSchemeSetters.auto}
						variant="default"
					>
						Auto
					</Button>
					<Button
						leftSection={<F7SunMaxFill />}
						onPointerDown={colorSchemeSetters.light}
						variant="default"
					>
						Light
					</Button>
					<Button
						leftSection={<F7MoonFill />}
						onPointerDown={colorSchemeSetters.dark}
						variant="default"
					>
						Dark
					</Button>
				</Group>
			</Modal>

			<AppShell.Navbar p="md">
				<Sidebar />
			</AppShell.Navbar>

			<AppShell.Main>
				<Outlet />
			</AppShell.Main>
		</>
	);
};

interface MainProps {
	isSidebarOpenDesktop: boolean;
	toggleDesktop: () => void;
	isSidebarOpenMobile: boolean;
	toggleMobile: () => void;
}

const Main = ({
	isSidebarOpenDesktop,
	isSidebarOpenMobile,
	toggleDesktop,
	toggleMobile,
}: MainProps) => {
	const { setColorScheme } = useMantineColorScheme();
	const [isThemeModalOpen, { open: openThemeModal, close: closeThemeModal }] =
		useDisclosure(false);

	const colorSchemeSetters = useMemo(() => {
		return {
			dark: () => setColorScheme("dark"),
			light: () => setColorScheme("light"),
			auto: () => setColorScheme("auto"),
		};
	}, [setColorScheme]);

	return (
		<>
			<MainPure
				isSidebarOpenDesktop={isSidebarOpenDesktop}
				toggleDesktop={toggleDesktop}
				isSidebarOpenMobile={isSidebarOpenMobile}
				toggleMobile={toggleMobile}
				isThemeSettingsOpen={isThemeModalOpen}
				openThemeSettings={openThemeModal}
				closeThemeSettings={closeThemeModal}
				colorSchemeSetters={colorSchemeSetters}
			/>
		</>
	);
};

export const Route = createRootRoute({
	component: Root,
});
