import {
	createTheme,
	MantineProvider,
	Burger,
	Group,
	TextInput,
	Select,
	Flex,
	SegmentedControl,
	Center,
	useMantineTheme,
	Stack,
	Button,
	Divider,
	Title,
} from "@mantine/core";
import { useDisclosure } from "@mantine/hooks";
import { AppShell } from "@mantine/core";
import { useForm } from "@mantine/form";
import { F7SquareGrid2x2 } from "./components/icons/F7SquareGrid2x2";
import { F7ListBullet } from "./components/icons/F7ListBullet";
import { useBreakpoint } from "./lib/hooks/use-breakpoint";

const catppuccinShades = {
	rosewater: [
		"#bca8a5",
		"#c8b4b0",
		"#d5c0bd",
		"#e1cdc9",
		"#eed9d5",
		"#fbe6e2",
		"#fff3ee",
		"#fffffb",
		"#ffffff",
		"#ffffff",
	],
	flamingo: [
		"#b99696",
		"#c5a2a2",
		"#d2aeae",
		"#debaba",
		"#ebc6c6",
		"#f8d3d3",
		"#ffdfdf",
		"#ffecec",
		"#fff9f9",
		"#ffffff",
	],
	pink: [
		"#bc8caf",
		"#c897bb",
		"#d5a3c7",
		"#e1afd4",
		"#eebbe0",
		"#fbc8ed",
		"#ffd4fa",
		"#ffe1ff",
		"#ffedff",
		"#fffaff",
	],
	mauve: [
		"#9371be",
		"#9f7dca",
		"#ab88d7",
		"#b894e3",
		"#c4a0f0",
		"#d1acfd",
		"#deb8ff",
		"#eac4ff",
		"#f7d0ff",
		"#ffddff",
	],
	red: [
		"#b85674",
		"#c5617f",
		"#d26d8a",
		"#df7996",
		"#ec85a2",
		"#f991ad",
		"#ff9dba",
		"#ffa9c6",
		"#ffb5d2",
		"#ffc2df",
	],
	maroon: [
		"#b16b77",
		"#be7683",
		"#ca828e",
		"#d78e9a",
		"#e49aa6",
		"#f1a6b2",
		"#feb2be",
		"#ffbeca",
		"#ffcad6",
		"#ffd7e3",
	],
	peach: [
		"#be7e54",
		"#cb895f",
		"#d8956a",
		"#e6a075",
		"#f3ac81",
		"#ffb98c",
		"#ffc598",
		"#ffd1a4",
		"#ffdeb0",
		"#ffeabc",
	],
	yellow: [
		"#bfaa7a",
		"#ccb685",
		"#d8c291",
		"#e5cf9d",
		"#f2dba8",
		"#ffe8b5",
		"#fff5c1",
		"#ffffcd",
		"#ffffda",
		"#ffffe6",
	],
	green: [
		"#70ab6c",
		"#7bb778",
		"#87c383",
		"#93d08f",
		"#9fdc9b",
		"#ace9a6",
		"#b8f6b3",
		"#c4ffbf",
		"#d1ffcb",
		"#deffd8",
	],
	teal: [
		"#5daa9e",
		"#69b6aa",
		"#75c2b6",
		"#81cfc2",
		"#8ddbce",
		"#9ae8db",
		"#a6f5e7",
		"#b3fff4",
		"#bfffff",
		"#ccffff",
	],
	sky: [
		"#4fa4b3",
		"#5cb0bf",
		"#69bccb",
		"#76c9d8",
		"#82d5e4",
		"#8fe2f1",
		"#9beffe",
		"#a8fbff",
		"#b5ffff",
		"#c2ffff",
	],
	sapphire: [
		"#3691b4",
		"#449cc0",
		"#52a8cc",
		"#60b4d9",
		"#6dc0e5",
		"#7acdf2",
		"#87d9ff",
		"#94e6ff",
		"#a1f2ff",
		"#aeffff",
	],
	blue: [
		"#4f7fc1",
		"#5c8acd",
		"#6996da",
		"#76a2e6",
		"#82aef3",
		"#8fbaff",
		"#9cc6ff",
		"#a8d2ff",
		"#b5dfff",
		"#c2ebff",
	],
	lavender: [
		"#7d88c5",
		"#8994d1",
		"#95a0de",
		"#a1abea",
		"#adb7f7",
		"#bac4ff",
		"#c6d0ff",
		"#d3dcff",
		"#e0e9ff",
		"#edf6ff",
	],
} as const;

const theme = createTheme({
	colors: {
		...catppuccinShades,
	},
});

function FilterControls() {
	const LibraryBookSortOrder = {
		nameAz: "name-asc",
		nameZa: "name-desc",
		authorAz: "author-asc",
		authorZa: "author-desc",
	} as const;
	const LibraryBookSortOrderStrings: Record<
		keyof typeof LibraryBookSortOrder,
		string
	> = {
		nameAz: "Name (A-Z)",
		nameZa: "Name (Z-A)",
		authorAz: "Author (A-Z)",
		authorZa: "Author (Z-A)",
	} as const;
	const LBSOSEntries: [keyof typeof LibraryBookSortOrder, string][] =
		Object.entries(LibraryBookSortOrder) as [
			keyof typeof LibraryBookSortOrder,
			string,
		][];

	const form = useForm<{
		query: string;
		sortOrder: keyof typeof LibraryBookSortOrder;
	}>({
		initialValues: {
			query: "",
			sortOrder: "authorAz",
		},
	});
	const theme = useMantineTheme();
	const mdBreakpoint = useBreakpoint("md");
	const viewControls = [
		{
			value: "preview",
			label: (
				<Center style={{ gap: 4 }}>
					<F7SquareGrid2x2 />
					{mdBreakpoint && <span>Covers</span>}
				</Center>
			),
		},
		{
			value: "code",
			label: (
				<Center style={{ gap: 4 }}>
					<F7ListBullet />
					{mdBreakpoint && <span>List</span>}
				</Center>
			),
		},
	];

	return (
		<Flex
			mih={50}
			gap="sm"
			miw={100}
			justify="space-between"
			align="center"
			direction="row"
			wrap="wrap"
		>
			<TextInput
				miw="32ch"
				placeholder="Search book titles and authors"
				{...form.getInputProps("query")}
			/>
			<Select
				placeholder="Sort Order"
				allowDeselect={false}
				w={150}
				data={LBSOSEntries.map(([key]) => ({
					value: key,
					label: LibraryBookSortOrderStrings[key],
				}))}
				{...form.getInputProps("sortOrder")}
			/>

			<SegmentedControl color={theme.colors.lavender[2]} data={viewControls} />
		</Flex>
	);
}

function Header() {
	return (
		<Stack>
			<FilterControls />
			<p>Showing 1-158 of 158 items</p>
		</Stack>
	);
}

function App() {
	const [mobileOpened, { toggle: toggleMobile }] = useDisclosure();
	const [desktopOpened, { toggle: toggleDesktop }] = useDisclosure(true);

	return (
		<MantineProvider theme={theme} forceColorScheme="dark">
			<AppShell
				padding="md"
				header={{ height: 60 }}
				navbar={{
					width: 200,
					breakpoint: "sm",
					collapsed: { mobile: !mobileOpened, desktop: !desktopOpened },
				}}
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
					<Header />
				</AppShell.Main>
			</AppShell>
		</MantineProvider>
	);
}

export default App;
