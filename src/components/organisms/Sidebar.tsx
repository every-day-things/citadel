import { type ImportableBookMetadata, NewAuthor } from "@/bindings";
import { F7BookFill } from "@/components/icons/F7BookFill";
import { F7Gear } from "@/components/icons/F7Gear";
import { F7SunMaxFill } from "@/components/icons/F7SunMaxFill";
import { FluentLibraryFilled } from "@/components/icons/FluentLibraryFilled";
import { useHardcoverModal } from "@/lib/contexts/modal-hardcover/hooks";
import { useLibrarySelectModal } from "@/lib/contexts/modal-library-select/hooks";
import { useThemeModal } from "@/lib/contexts/modal-theme/hooks";
import {
	checkForUpdates,
	installUpdateIfAvailable,
} from "@/lib/services/app-updates";
import { IS_DEV } from "@/lib/env";
import { useSettings } from "@/stores/settings/store";
import { isTauri } from "@tauri-apps/api/core";
import {
	LibraryState,
	useAuthors,
	useLibraryActions,
	useLibraryState,
} from "@/stores/library/store";
import {
	ActionIcon,
	Button,
	Divider,
	Group,
	Loader,
	Menu,
	Modal,
	NavLink,
	Stack,
	Text,
	Title,
} from "@mantine/core";
import { useDisclosure } from "@mantine/hooks";
import { notifications } from "@mantine/notifications";
import { Link, useRouterState } from "@tanstack/react-router";
import { useCallback, useMemo, useState } from "react";
import {
	AddBookForm,
	title as addBookFormTitle,
} from "../molecules/AddBookForm";

export const Sidebar = () => {
	const state = useLibraryState();
	const { location } = useRouterState();
	const { open: openLibrarySelectModal } = useLibrarySelectModal();
	const actions = useLibraryActions();
	const authors = useAuthors();

	const [metadata, setMetadata] = useState<ImportableBookMetadata | null>();
	const [isSettingsMenuOpen, setIsSettingsMenuOpen] = useState(false);
	const [isCheckingForUpdates, setIsCheckingForUpdates] = useState(false);
	const [isUpdatePromptOpen, setIsUpdatePromptOpen] = useState(false);
	const [isInstallingUpdate, setIsInstallingUpdate] = useState(false);

	const [
		isAddBookModalOpen,
		{ close: closeAddBookModal, open: openAddBookModal },
	] = useDisclosure(false);

	const [, { open: openThemeModal }] = useThemeModal();
	const [, { open: openHardcoverModal }] = useHardcoverModal();
	const autoUpdateCheckingEnabled = useSettings(
		(state) => state.autoUpdateCheckingEnabled,
	);
	const setAutoUpdateCheckingEnabled = useSettings(
		(state) => state.setAutoUpdateCheckingEnabled,
	);

	const onCreateAuthor = useCallback(
		async (newAuthorName: string) => {
			const newAuthor: NewAuthor = {
				name: newAuthorName,
				sortable_name: newAuthorName,
			};

			await actions.createAuthors([newAuthor]);
		},
		[actions],
	);

	const authorList = useMemo(
		() => authors.map((author) => author.name),
		[authors],
	);

	const selectAndEditBookFile = useCallback(() => {
		if (state !== LibraryState.ready) return;

		actions
			.promptToAddBook()
			.then((importableMetadata) => {
				if (importableMetadata) {
					setMetadata(importableMetadata);
					openAddBookModal();
				}
			})
			.catch((failure) => {
				console.error("failed to import new book: ", failure);
			});
	}, [actions, state, openAddBookModal]);

	const addBookByMetadataWithEffects = async (form: AddBookForm) => {
		if (!metadata || state !== LibraryState.ready) return;
		const editedMetadata: ImportableBookMetadata = {
			...metadata,
			title: form.title,
			author_names: form.authorList,
		};
		try {
			await actions.addBook(editedMetadata);
			closeAddBookModal();
			setMetadata(null);
		} catch (error) {
			console.error("Failed to add book to database", error);
		}
	};

	const checkForUpdatesHandler = useCallback(async () => {
		if (!isTauri()) return;

		setIsCheckingForUpdates(true);
		notifications.show({
			id: "check-for-updates",
			title: "Checking for updates",
			message: "Looking for a newer Citadel release.",
			loading: true,
			autoClose: false,
			withCloseButton: false,
		});

		try {
			const updateCheckResult = await checkForUpdates();
			if (updateCheckResult.has_update) {
				if (IS_DEV) {
					notifications.update({
						id: "check-for-updates",
						title: "Update available (dev mode)",
						message: `Updates are not applied in dev. You would update to version ${
							updateCheckResult.version ?? "latest"
						}.`,
						color: "blue",
						loading: false,
						autoClose: 6500,
						withCloseButton: true,
					});
					setIsSettingsMenuOpen(false);
					return;
				}

				notifications.update({
					id: "check-for-updates",
					title: "Update available",
					message: "A new Citadel version is ready. Install now or later.",
					color: "blue",
					loading: false,
					autoClose: 4500,
					withCloseButton: true,
				});
				setIsUpdatePromptOpen(true);
				setIsSettingsMenuOpen(false);
			} else {
				notifications.update({
					id: "check-for-updates",
					title: "You are up to date",
					message: "Citadel is already on the latest release.",
					color: "green",
					loading: false,
					autoClose: 3500,
					withCloseButton: true,
				});
				setIsSettingsMenuOpen(false);
			}
		} catch (error) {
			notifications.update({
				id: "check-for-updates",
				title: "Update check failed",
				message: error instanceof Error ? error.message : String(error),
				color: "red",
				loading: false,
				autoClose: 5000,
				withCloseButton: true,
			});
			setIsSettingsMenuOpen(false);
		} finally {
			setIsCheckingForUpdates(false);
		}
	}, []);

	const installAvailableUpdateHandler = useCallback(async () => {
		setIsInstallingUpdate(true);
		notifications.show({
			id: "install-update",
			title: "Installing update",
			message: "Downloading and applying the latest Citadel release.",
			loading: true,
			autoClose: false,
			withCloseButton: false,
		});

		try {
			const result = await installUpdateIfAvailable();
			if (result === "no-update") {
				notifications.update({
					id: "install-update",
					title: "No update available",
					message: "This update is no longer available.",
					color: "yellow",
					loading: false,
					autoClose: 4000,
					withCloseButton: true,
				});
				setIsUpdatePromptOpen(false);
			}
		} catch (error) {
			notifications.update({
				id: "install-update",
				title: "Update install failed",
				message: error instanceof Error ? error.message : String(error),
				color: "red",
				loading: false,
				autoClose: 5000,
				withCloseButton: true,
			});
		} finally {
			setIsInstallingUpdate(false);
		}
	}, []);

	const toggleAutoUpdateCheckingHandler = useCallback(async () => {
		await setAutoUpdateCheckingEnabled(!autoUpdateCheckingEnabled);
	}, [autoUpdateCheckingEnabled, setAutoUpdateCheckingEnabled]);

	const openThemeModalHandler = useCallback(() => {
		openThemeModal();
		setIsSettingsMenuOpen(false);
	}, [openThemeModal]);

	const openLibrarySelectModalHandler = useCallback(() => {
		openLibrarySelectModal();
		setIsSettingsMenuOpen(false);
	}, [openLibrarySelectModal]);

	const openHardcoverModalHandler = useCallback(() => {
		openHardcoverModal();
		setIsSettingsMenuOpen(false);
	}, [openHardcoverModal]);

	const toggleAutoUpdateCheckingHandlerWithMenu = useCallback(async () => {
		await toggleAutoUpdateCheckingHandler();
		setIsSettingsMenuOpen(false);
	}, [toggleAutoUpdateCheckingHandler]);

	const shelves = useMemo(() => {
		return [
			{
				title: "All books",
				path: "/",
				isActive: () => location.pathname === "/",
			},
		];
	}, [location]);

	if (state !== LibraryState.ready) {
		return null;
	}

	return (
		<>
			<Modal
				opened={isUpdatePromptOpen}
				onClose={() => setIsUpdatePromptOpen(false)}
				title="Update available"
				centered
				closeOnClickOutside={!isInstallingUpdate}
				closeOnEscape={!isInstallingUpdate}
				withCloseButton={!isInstallingUpdate}
			>
				<Stack gap="md">
					<Text size="sm">
						A new Citadel release is available. Install now?
					</Text>
					<Group justify="flex-end">
						<Button
							variant="default"
							onClick={() => setIsUpdatePromptOpen(false)}
							disabled={isInstallingUpdate}
						>
							Later
						</Button>
						<Button
							onClick={() => void installAvailableUpdateHandler()}
							loading={isInstallingUpdate}
						>
							Install and restart
						</Button>
					</Group>
				</Stack>
			</Modal>
			{metadata && (
				<AddBookModalPure
					authorNameList={authorList}
					isOpen={isAddBookModalOpen}
					metadata={metadata}
					onClose={closeAddBookModal}
					onCreateAuthor={onCreateAuthor}
					onSubmitHandler={addBookByMetadataWithEffects}
				/>
			)}
			<SidebarPure
				addBookHandler={selectAndEditBookFile}
				switchLibraryHandler={openLibrarySelectModalHandler}
				shelves={shelves}
				openThemeModal={openThemeModalHandler}
				openHardcoverModal={openHardcoverModalHandler}
				autoUpdateCheckingEnabled={autoUpdateCheckingEnabled}
				isSettingsMenuOpen={isSettingsMenuOpen}
				isCheckingForUpdates={isCheckingForUpdates}
				onSettingsMenuChange={setIsSettingsMenuOpen}
				checkForUpdatesHandler={() => void checkForUpdatesHandler()}
				toggleAutoUpdateCheckingHandler={() => {
					void toggleAutoUpdateCheckingHandlerWithMenu();
				}}
			/>
		</>
	);
};

interface AddBookModalProps {
	authorNameList: string[];
	isOpen: boolean;
	metadata: ImportableBookMetadata;
	onClose: () => void;
	onCreateAuthor: (newAuthorName: string) => Promise<void>;
	onSubmitHandler: (form: AddBookForm) => Promise<void>;
}

const AddBookModalPure = ({
	authorNameList,
	isOpen,
	metadata,
	onClose,
	onCreateAuthor,
	onSubmitHandler,
}: AddBookModalProps) => {
	return (
		<Modal.Root opened={isOpen} onClose={onClose} size={"lg"}>
			<Modal.Overlay blur={3} backgroundOpacity={0.35} />
			<Modal.Content>
				<Modal.Header>
					<Modal.Title>{addBookFormTitle}</Modal.Title>
					<Modal.CloseButton />
				</Modal.Header>
				<Modal.Body>
					<AddBookForm
						initial={{
							authorList: metadata?.author_names ?? [],
							title: metadata?.title ?? "",
						}}
						authorList={authorNameList}
						fileName={metadata?.path ?? ""}
						hideTitle={true}
						onCreateAuthor={onCreateAuthor}
						onSubmit={onSubmitHandler}
					/>
				</Modal.Body>
			</Modal.Content>
		</Modal.Root>
	);
};

interface SidebarPureProps {
	addBookHandler: () => void;
	switchLibraryHandler: () => void;
	shelves: {
		title: string;
		path: string;
		isActive: () => boolean;
	}[];
	openThemeModal: () => void;
	openHardcoverModal: () => void;
	autoUpdateCheckingEnabled: boolean;
	isSettingsMenuOpen: boolean;
	isCheckingForUpdates: boolean;
	onSettingsMenuChange: (opened: boolean) => void;
	checkForUpdatesHandler: () => void;
	toggleAutoUpdateCheckingHandler: () => void;
}

const SidebarPure = ({
	addBookHandler,
	switchLibraryHandler,
	shelves,
	openThemeModal,
	openHardcoverModal,
	autoUpdateCheckingEnabled,
	isSettingsMenuOpen,
	isCheckingForUpdates,
	onSettingsMenuChange,
	checkForUpdatesHandler,
	toggleAutoUpdateCheckingHandler,
}: SidebarPureProps) => {
	return (
		<Stack justify="space-between" h="100%">
			<Stack>
				<Title order={5}>My library</Title>
				<Button variant="filled" onPointerDown={addBookHandler}>
					⊕ Add book
				</Button>
				<NavLink
					label="Authors"
					component={Link}
					to="/authors"
					active={location.pathname === "/authors"}
				/>
				<Divider my="md" />
				<Title order={5}>Shelves</Title>
				{shelves.map(({ title, path, isActive }) => (
					<NavLink
						key={path}
						label={title}
						component={Link}
						to={path}
						active={isActive()}
					/>
				))}
			</Stack>
			<Stack>
				<Menu
					shadow="md"
					width={220}
					opened={isSettingsMenuOpen}
					onChange={onSettingsMenuChange}
					closeOnItemClick={false}
				>
					<Menu.Target>
						<ActionIcon color={"text"} aria-label="Settings" size={"sm"}>
							<F7Gear style={{ color: "var(--mantine-color-text)" }} />{" "}
						</ActionIcon>
					</Menu.Target>

					<Menu.Dropdown ml="xs">
						<Menu.Item
							leftSection={<F7SunMaxFill title="Colour scheme" />}
							onClick={openThemeModal}
						>
							Theme
						</Menu.Item>

						<Menu.Item
							leftSection={<FluentLibraryFilled />}
							onClick={switchLibraryHandler}
						>
							Switch library
						</Menu.Item>

						<Menu.Item
							leftSection={<F7BookFill />}
							onClick={openHardcoverModal}
						>
							Hardcover API
						</Menu.Item>

						<Menu.Divider />

						<Menu.Item
							onClick={checkForUpdatesHandler}
							disabled={isCheckingForUpdates}
							rightSection={
								isCheckingForUpdates ? <Loader size="xs" /> : undefined
							}
						>
							Check for updates
						</Menu.Item>

						<Menu.Item onClick={toggleAutoUpdateCheckingHandler}>
							Auto updates: {autoUpdateCheckingEnabled ? "On" : "Off"}
						</Menu.Item>
					</Menu.Dropdown>
				</Menu>
			</Stack>
		</Stack>
	);
};
