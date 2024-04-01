import {
	Burger,
	Button,
	Divider,
	Group,
	MantineProvider,
	Stack,
	Title,
} from "@mantine/core";
import { AppShell } from "@mantine/core";
import { useDisclosure } from "@mantine/hooks";
import { BookView } from "./components/organisms/BookView";
import { LibraryProvider } from "./lib/contexts/library";
import { resolver, theme } from "./lib/theme";

function App() {
	const [mobileOpened, { toggle: toggleMobile }] = useDisclosure();
	const [desktopOpened, { toggle: toggleDesktop }] = useDisclosure(true);

	return (
		<LibraryProvider>
			<MantineProvider theme={theme} forceColorScheme="dark" cssVariablesResolver={resolver}>
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
						<Stack>
							<Title order={5}>My library</Title>
							<Button color={theme.colors?.lavender?.[1]} variant="filled">
								⊕ Add book
							</Button>
							<Button color={theme.colors?.lavender?.[1]} variant="outline">
								Switch library
							</Button>
							<Button
								variant="transparent"
								color={theme.colors?.lavender?.[9]}
								justify="flex-start"
							>
								First-time setup
							</Button>
							<Button
								variant="transparent"
								color={theme.colors?.lavender?.[9]}
								justify="flex-start"
							>
								Configure library
							</Button>
						</Stack>
						<Divider my="md" />
						<Stack>
							<Title order={5}>My shelves</Title>
							<Button
								variant="transparent"
								color={theme.colors?.lavender?.[9]}
								justify="flex-start"
							>
								All books
							</Button>
						</Stack>
					</AppShell.Navbar>

					<AppShell.Main>
						<BookView />
					</AppShell.Main>
				</AppShell>
			</MantineProvider>
		</LibraryProvider>
	);
}

export default App;
