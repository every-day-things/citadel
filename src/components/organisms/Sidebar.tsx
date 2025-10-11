import { NewAuthor, type ImportableBookMetadata } from "@/bindings";
import { LibraryState, useLibrary } from "@/lib/contexts/library";
import { commitAddBook, promptToAddBook } from "@/lib/services/library";
import {
	ActionIcon,
	Button,
	Divider,
	Menu,
	Modal,
	NavLink,
	Stack,
	Title,
	noop,
} from "@mantine/core";
import { useDisclosure } from "@mantine/hooks";
import { Link, useRouterState } from "@tanstack/react-router";
import { useCallback, useEffect, useMemo, useState } from "react";
import {
	AddBookForm,
	title as addBookFormTitle,
} from "../molecules/AddBookForm";
import { getCurrentWebviewWindow } from "@tauri-apps/api/webviewWindow";
import { addBookByDragDrop } from "@/lib/services/library/_internal/addBook";
import { F7SunMaxFill } from "@/components/icons/F7SunMaxFill";
import { F7Gear } from "@/components/icons/F7Gear";
import { useThemeModal } from "@/lib/contexts/modal-theme/hooks";
import { useLibrarySelectModal } from "@/lib/contexts/modal-library-select/hooks";
import { FluentLibraryFilled } from "@/components/icons/FluentLibraryFilled";
import { sortAuthors } from "@/lib/domain/author";
const appWindow = getCurrentWebviewWindow();

export const Sidebar = () => {
	const { library, state, eventEmitter } = useLibrary();
	const { location } = useRouterState();
	const { open: openLibrarySelectModal } = useLibrarySelectModal();

	const [metadata, setMetadata] = useState<ImportableBookMetadata | null>();
	const [authorList, setAuthorList] = useState<string[]>([]);

	const [
		isAddBookModalOpen,
		{ close: closeAddBookModal, open: openAddBookModal },
	] = useDisclosure(false);

	const [, { open: openThemeModal }] = useThemeModal();

	const onCreateAuthor = useCallback(
		(newAuthorName: string) => {
			const newAuthor: NewAuthor = {
				name: newAuthorName,
				sortable_name: newAuthorName,
			};

			library?.createAuthors([newAuthor]).catch(noop);
		},
		[library],
	);

	useEffect(() => {
		let unlisten: (() => void) | undefined;

		const setupFileDropListener = async () => {
			const { listen } = await import("@tauri-apps/api/event");
			
			unlisten = await listen("tauri://drag-drop", (event: any) => {
				if (!library) return;
				void (async () => {
					if (event.payload && event.payload.paths) {
						const metadataList = await addBookByDragDrop(
							library,
							event.payload.paths,
						);
						const firstItem = metadataList[0];
						if (firstItem) {
							setMetadata(firstItem);
							openAddBookModal();
						}
					}
				})();
			});
		};

		void setupFileDropListener();

		return () => {
			if (unlisten) {
				unlisten();
			}
		};
	}, [library, openAddBookModal, setMetadata]);

	useEffect(() => {
		void (async () => {
			setAuthorList(
				((await library?.listAuthors()) ?? [])
					.sort(sortAuthors)
					.map((author) => author.name),
			);
		})();
	}, [library]);

	const selectAndEditBookFile = useCallback(() => {
		if (state !== LibraryState.ready) return;

		promptToAddBook(library)
			.then((importableMetadata) => {
				if (importableMetadata) {
					setMetadata(importableMetadata);
					openAddBookModal();
				}
			})
			.catch((failure) => {
				console.error("failed to import new book: ", failure);
			});
	}, [library, state, openAddBookModal]);

	const addBookByMetadataWithEffects = (form: AddBookForm) => {
		if (!metadata || state !== LibraryState.ready) return;
		const editedMetadata: ImportableBookMetadata = {
			...metadata,
			title: form.title,
			author_names: form.authorList,
		};
		commitAddBook(library, editedMetadata, eventEmitter)
			.then(() => {
				closeAddBookModal();
				setMetadata(null);
			})
			.catch((error) => {
				console.error("Failed to add book to database", error);
			});
	};
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
				switchLibraryHandler={openLibrarySelectModal}
				shelves={shelves}
				openThemeModal={openThemeModal}
			/>
		</>
	);
};

interface AddBookModalProps {
	authorNameList: string[];
	isOpen: boolean;
	metadata: ImportableBookMetadata;
	onClose: () => void;
	onCreateAuthor: (newAuthorName: string) => void;
	onSubmitHandler: (form: AddBookForm) => void;
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
}

const SidebarPure = ({
	addBookHandler,
	switchLibraryHandler,
	shelves,
	openThemeModal,
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
				<Menu shadow="md" width={180}>
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
					</Menu.Dropdown>
				</Menu>
			</Stack>
		</Stack>
	);
};
