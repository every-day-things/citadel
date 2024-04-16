import { LibraryProvider } from "$lib/contexts/library";
import { SettingsProvider } from "$lib/contexts/settings";
import { theme } from "$lib/theme";
import {
	ActionIcon,
	Burger,
	Button,
	ColorSchemeScript,
	Group,
	MantineProvider,
	Modal,
	useMantineColorScheme,
} from "@mantine/core";
import { AppShell } from "@mantine/core";
import { useDisclosure } from "@mantine/hooks";
import { useEffect, useMemo, useState } from "react";
import { F7CircleRighthalfFill } from "./components/icons/F7CircleRightHalfFill";
import { F7MoonFill } from "./components/icons/F7MoonFill";
import { F7SunMaxFill } from "./components/icons/F7SunMaxFill";
import { Sidebar } from "./components/organisms/Sidebar";
import { Books } from "./components/pages/Books";
import { settings } from "./stores/settings";

export const App = () => {
	const [mobileOpened, { toggle: toggleMobile }] = useDisclosure(false);
	const [desktopOpened, { toggle: toggleDesktop }] = useDisclosure(true);

	const [libraryPath, setLibraryPath] = useState<string | null>(null);
	useEffect(() => {
		settings.subscribe((settings) => {
			if (settings !== undefined) setLibraryPath(settings.calibreLibraryPath);
		});
	}, []);

	if (libraryPath === null) {
		return null;
	}

	return (
		<SettingsProvider value={settings}>
			<LibraryProvider libraryPath={libraryPath}>
			<ColorSchemeScript defaultColorScheme="auto" />
			<MantineProvider theme={theme} defaultColorScheme="auto">
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
			</MantineProvider>
		</LibraryProvider>

		</SettingsProvider>
	);
};

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
				<Books />
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
