import { LibraryState, useLibrary } from "@/lib/contexts/library";
import { Button, Divider, Modal, Stack, Title } from "@mantine/core";
import { beginAddBookHandler } from "./AddBook";
import { useCallback, useState } from "react";
import { ImportableBookMetadata } from "@/bindings";
import { useDisclosure } from "@mantine/hooks";
import { AddBookForm, title as addBookFormTitle } from "./AddBookForm";
import { commitAddBook } from "@/lib/library/addBook";

interface AddBookModalProps {
	isOpen: boolean;
	onClose: () => void;
	metadata: ImportableBookMetadata;
	onSubmitHandler: (form: AddBookForm) => void;
}

const AddBookModalPure = ({
	isOpen,
	onClose,
	metadata,
	onSubmitHandler,
}: AddBookModalProps) => {
	return (
		<Modal.Root opened={isOpen} onClose={onClose}>
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
						authorList={["Arthur C. Clarke"]}
						fileName={metadata?.path ?? ""}
						hideTitle={true}
						onSubmit={onSubmitHandler}
					/>
				</Modal.Body>
			</Modal.Content>
		</Modal.Root>
	);
};

interface SidebarPureProps {
	addBookHandler: () => void;
}

const SidebarPure = ({ addBookHandler }: SidebarPureProps) => {
	return (
		<>
			<Stack>
				<Title order={5}>My library</Title>
				<Button variant="filled" onClick={addBookHandler}>
					⊕ Add book
				</Button>
				<Button variant="outline">Switch library</Button>
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
				<Button variant="transparent" justify="flex-start">
					All books
				</Button>
			</Stack>
		</>
	);
};

export const Sidebar = () => {
	const { library, state } = useLibrary();
	const [metadata, setMetadata] = useState<ImportableBookMetadata | null>();
	const [
		isAddBookModalOpen,
		{ close: closeAddBookModal, open: openAddBookModal },
	] = useDisclosure(false);

	const selectAndEditBookFile = useCallback(() => {
		if (state !== LibraryState.ready) return;

		beginAddBookHandler(library)
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
		commitAddBook(library, editedMetadata)
			.then(() => {
				closeAddBookModal();
				setMetadata(null);
			})
			.catch((error) => {
				console.error("Failed to add book to database", error);
			});
	};

	if (state !== LibraryState.ready) {
		return null;
	}
	return (
		<>
			{metadata && (
				<AddBookModalPure
					isOpen={isAddBookModalOpen}
					onClose={closeAddBookModal}
					metadata={metadata}
					onSubmitHandler={addBookByMetadataWithEffects}
				/>
			)}
			<SidebarPure addBookHandler={selectAndEditBookFile} />
		</>
	);
};
