import { Burger, Group, MantineProvider } from "@mantine/core";
import { AppShell } from "@mantine/core";
import { useDisclosure } from "@mantine/hooks";
import { Books } from "./components/pages/Books";
import { LibraryProvider } from "./lib/contexts/library";
import { theme } from "./lib/theme";
import { Sidebar } from "./components/organisms/Sidebar";

function App() {
	const [mobileOpened, { toggle: toggleMobile }] = useDisclosure();
	const [desktopOpened, { toggle: toggleDesktop }] = useDisclosure(true);

	return (
		<LibraryProvider>
			<MantineProvider theme={theme} forceColorScheme="dark">
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
					<AppShell.Header h={48}>
						<Group h="100%" px="md">
							<Burger
								opened={mobileOpened}
								onClick={toggleMobile}
								hiddenFrom="sm"
								size="sm"
							/>
							<Burger
								opened={desktopOpened}
								onClick={toggleDesktop}
								visibleFrom="sm"
								size="sm"
							/>
						</Group>
					</AppShell.Header>

					<AppShell.Navbar p="md">
						<Sidebar />
					</AppShell.Navbar>

					<AppShell.Main>
						<Books />
					</AppShell.Main>
				</AppShell>
			</MantineProvider>
		</LibraryProvider>
	);
}

export default App;
