import { F7CircleRighthalfFill } from "@/components/icons/F7CircleRightHalfFill";
import { F7MoonFill } from "@/components/icons/F7MoonFill";
import { F7SidebarLeft } from "@/components/icons/F7SidebarLeft";
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
			<Suspense>
				<RouterDevTools />
			</Suspense>
		</>
	);
};

const lazyLoadTanstackDevTools = () => {
	return import("@tanstack/router-devtools").then((res) => ({
		default: res.TanStackRouterDevtools,
	}));
};

const RouterDevTools =
	process.env.NODE_ENV === "production"
		? () => null // Render nothing in production
		: React.lazy(lazyLoadTanstackDevTools);

interface MainPureProps {
	isSidebarOpenMobile: boolean;
	toggleMobile: () => void;
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
	isSidebarOpenMobile,
	openThemeSettings,
	isThemeSettingsOpen,
	closeThemeSettings,
	colorSchemeSetters,
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
					<ActionIcon
						variant="transparent"
						color={"text"}
						aria-label="Settings"
						size={"xs"}
						onClick={openThemeSettings}
					>
						<F7SunMaxFill title="Colour scheme" />
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
						leftSection={<F7SunMaxFill title="" />}
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
	toggleDesktop: () => void;
	isSidebarOpenMobile: boolean;
	toggleMobile: () => void;
}

const Main = ({
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
