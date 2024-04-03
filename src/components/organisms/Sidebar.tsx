import { LibraryState, useLibrary } from "@/lib/contexts/library";
import { Button, Divider, Modal, Stack, Title } from "@mantine/core";
import { beginAddBookHandler } from "./AddBook";
import { useCallback, useState } from "react";
import { ImportableBookMetadata } from "@/bindings";
import { useDisclosure } from "@mantine/hooks";
import { AddBookForm } from "./AddBookForm";

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

	const addBookHandler = useCallback(async () => {
		if (state !== LibraryState.ready) return;

		const importableMetadata = await beginAddBookHandler(library);
		if (importableMetadata) {
			setMetadata(importableMetadata);
			openAddBookModal();
		}
	}, [library, state, openAddBookModal]);

	if (state !== LibraryState.ready) {
		return null;
	}
	return (
		<>
			<Modal
				opened={isAddBookModalOpen}
				onClose={closeAddBookModal}
			>
				<AddBookForm
					initial={{
						authorList: metadata?.author_names ?? [],
						title: metadata?.title ?? "",
					}}
					authorList={["Arthur C. Clarke"]}
					fileName={metadata?.path ?? ""}
				/>
			</Modal>
			<SidebarPure addBookHandler={addBookHandler} />
		</>
	);
};
