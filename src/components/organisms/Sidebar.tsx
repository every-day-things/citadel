import { LibraryState, useLibrary } from "@/lib/contexts/library";
import { Library } from "@/lib/library/_types";
import { Button, Divider, Stack, Title } from "@mantine/core";
import { beginAddBookHandler } from "./AddBook";
import { useCallback, useState } from "react";
import { ImportableBookMetadata } from "@/bindings";

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
	const [isAddBookModalOpen, setIsAddBookModalOpen] = useState(false);

	const addBookHandler = useCallback(async () => {
		if (state !== LibraryState.ready) return;

		const importableMetadata = await beginAddBookHandler(library);
		if (importableMetadata) {
			setMetadata(importableMetadata);
		}
	}, [library, state]);

	if (state !== LibraryState.ready) {
		return null;
	}
	return <SidebarPure addBookHandler={addBookHandler} />;
};
