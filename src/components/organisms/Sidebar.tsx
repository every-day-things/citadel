import { ImportableBookMetadata, LibraryAuthor, commands } from "@/bindings";
import { LibraryState, useLibrary } from "@/lib/contexts/library";
import { useSettings } from "@/lib/contexts/settings";
import { commitAddBook, promptToAddBook, pickLibrary } from "@/lib/services/library";
import { Button, Divider, Modal, Stack, Title } from "@mantine/core";
import { useDisclosure } from "@mantine/hooks";
import { Link } from "@tanstack/react-router";
import { useCallback, useEffect, useState } from "react";
import {
	AddBookForm,
	title as addBookFormTitle,
} from "../molecules/AddBookForm";
import {
	SWITCH_LIBRARY_TITLE as SwitchLibraryFormTitle,
	SwitchLibraryForm,
} from "../molecules/SwitchLibraryForm";

export const Sidebar = () => {
	const { library, state } = useLibrary();
	const { set, subscribe } = useSettings();

	const [metadata, setMetadata] = useState<ImportableBookMetadata | null>();
	const [currentLibraryPath, setCurrentLibraryPath] = useState<string>();
	const [authorList, setAuthorList] = useState<string[]>([]);

	const [
		isAddBookModalOpen,
		{ close: closeAddBookModal, open: openAddBookModal },
	] = useDisclosure(false);
	const [
		isSwitchLibraryModalOpen,
		{ close: closeSwitchLibraryModal, open: openSwitchLibraryModal },
	] = useDisclosure(false);

	useEffect(() => {
		void (async () => {
			setAuthorList(
				((await library?.listAuthors()) ?? [])
					.sort(sortAuthors)
					.map((author) => author.name),
			);
		})();
	}, [library]);
	useEffect(() => {
		return subscribe((update) => {
			setCurrentLibraryPath(update.calibreLibraryPath);
		});
	}, [subscribe]);

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

	const switchLibrary = useCallback(() => {
		openSwitchLibraryModal();
	}, [openSwitchLibraryModal]);

	const addBookByMetadataWithEffects = (form: AddBookForm) => {
		if (!metadata || state !== LibraryState.ready) return;
		const editedMetadata: ImportableBookMetadata = {
			...metadata,
			title: form.title,
			author_names: form.authorList,
		};
		commitAddBook(library, editedMetadata)
			.then(() => {
				closeAddBookModal();
				setMetadata(null);
			})
			.catch((error) => {
				console.error("Failed to add book to database", error);
			});
	};
	const setNewLibraryPath = useCallback(
		async (form: SwitchLibraryForm) => {
			const selectedIsValid = await commands.clbQueryIsPathValidLibrary(
				form.libraryPath,
			);

			if (selectedIsValid) {
				await set("calibreLibraryPath", form.libraryPath);
				closeSwitchLibraryModal();
			} else {
				// TODO: You could create a new library, if you like.
				console.error("Invalid library path selected");
			}
		},
		[closeSwitchLibraryModal, set],
	);

	if (state !== LibraryState.ready) {
		return null;
	}

	if (currentLibraryPath === undefined) {
		return <p>Something went wrong!</p>;
	}

	return (
		<>
			{metadata && (
				<AddBookModalPure
					isOpen={isAddBookModalOpen}
					onClose={closeAddBookModal}
					metadata={metadata}
					onSubmitHandler={addBookByMetadataWithEffects}
					authorNameList={authorList}
				/>
			)}
			<SwitchLibraryPathModalPure
				isOpen={isSwitchLibraryModalOpen}
				onClose={closeSwitchLibraryModal}
			>
				<SwitchLibraryForm
					hideTitle={true}
					currentLibraryPath={currentLibraryPath}
					onSubmit={(form) => void setNewLibraryPath(form)}
					selectLibraryDirectory={pickLibrary}
				/>
			</SwitchLibraryPathModalPure>
			<SidebarPure
				addBookHandler={selectAndEditBookFile}
				switchLibraryHandler={switchLibrary}
				shelves={[
					{
						title: "All Books",
						LinkComponent: ({ children }: React.PropsWithChildren<unknown>) => (
							<Link to={"/"}>{children}</Link>
						),
					},
				]}
			/>
		</>
	);
};

interface AddBookModalProps {
	isOpen: boolean;
	onClose: () => void;
	metadata: ImportableBookMetadata;
	onSubmitHandler: (form: AddBookForm) => void;
	authorNameList: string[];
}

const AddBookModalPure = ({
	isOpen,
	onClose,
	metadata,
	onSubmitHandler,
	authorNameList,
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
						onSubmit={onSubmitHandler}
					/>
				</Modal.Body>
			</Modal.Content>
		</Modal.Root>
	);
};

interface SwitchLibraryPathModalPureProps {
	isOpen: boolean;
	onClose: () => void;
	children: React.ReactNode;
}

const SwitchLibraryPathModalPure = ({
	isOpen,
	onClose,
	children,
}: SwitchLibraryPathModalPureProps) => {
	return (
		<Modal.Root opened={isOpen} onClose={onClose} size={"lg"}>
			<Modal.Overlay blur={3} backgroundOpacity={0.35} />
			<Modal.Content>
				<Modal.Header>
					<Modal.Title>{SwitchLibraryFormTitle}</Modal.Title>
					<Modal.CloseButton />
				</Modal.Header>
				<Modal.Body>{children}</Modal.Body>
			</Modal.Content>
		</Modal.Root>
	);
};

const sortAuthors = (a: LibraryAuthor, b: LibraryAuthor) => {
	return a.sortable_name.localeCompare(b.sortable_name);
};

interface SidebarPureProps {
	addBookHandler: () => void;
	switchLibraryHandler: () => void;
	shelves: {
		title: string;
		LinkComponent: React.FunctionComponent<React.PropsWithChildren<unknown>>;
	}[];
}

const SidebarPure = ({
	addBookHandler,
	switchLibraryHandler,
	shelves,
}: SidebarPureProps) => {
	return (
		<>
			<Stack>
				<Title order={5}>My library</Title>
				<Button variant="filled" onPointerDown={addBookHandler}>
					⊕ Add book
				</Button>
				<Button variant="outline" onPointerDown={switchLibraryHandler}>
					Switch library
				</Button>
				<Button variant="transparent" justify="flex-start">
					First-time setup
				</Button>
				<Button variant="transparent" justify="flex-start">
					Configure library
				</Button>
			</Stack>
			<Divider my="md" />
			<Stack>
				<Title order={5}>My shelves</Title>
				{shelves.map(({ title, LinkComponent }) => (
					<LinkComponent key={title}>
						<Button variant="transparent" justify="flex-start">
							{title}
						</Button>
					</LinkComponent>
				))}
			</Stack>
		</>
	);
};
