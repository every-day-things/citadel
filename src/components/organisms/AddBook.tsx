import type { ImportableBookMetadata, NewAuthor } from "@/bindings";
import {
	AddBookForm,
	title as addBookFormTitle,
} from "@/components/molecules/AddBookForm";
import { usePlatform } from "@/lib/platform/context";
import {
	LibraryState,
	useAuthors,
	useLibraryActions,
	useLibraryState,
} from "@/stores/library/store";
import { IconButton, Sheet, Tooltip } from "@/components/ui";
import { useDisclosure } from "@mantine/hooks";
import { useCallback, useMemo, useState } from "react";

export const AddBookButton = () => {
	const state = useLibraryState();
	const actions = useLibraryActions();
	const authors = useAuthors();
	const platform = usePlatform();

	const [metadata, setMetadata] = useState<ImportableBookMetadata | null>();
	const [isModalOpen, { close: closeModal, open: openModal }] =
		useDisclosure(false);

	const authorList = useMemo(
		() => authors.map((author) => author.name),
		[authors],
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

	const selectAndEditBookFile = useCallback(() => {
		if (state !== LibraryState.ready) return;

		void (async () => {
			try {
				const extensions = await actions.listValidFileTypes();
				const filePath = await platform.dialogs.openFile({
					filters: [{ name: "Importable files", extensions }],
				});
				if (!filePath) return;

				const importableMetadata =
					await actions.getImportableBookMetadata(filePath);
				if (importableMetadata) {
					setMetadata(importableMetadata);
					openModal();
				}
			} catch (failure) {
				console.error("failed to import new book: ", failure);
			}
		})();
	}, [actions, state, openModal, platform]);

	const addBookByMetadataWithEffects = async (form: AddBookForm) => {
		if (!metadata || state !== LibraryState.ready) return;
		const editedMetadata: ImportableBookMetadata = {
			...metadata,
			title: form.title,
			author_names: form.authorList,
		};
		try {
			await actions.addBook(editedMetadata);
			closeModal();
			setMetadata(null);
		} catch (error) {
			console.error("Failed to add book to database", error);
		}
	};

	if (
		state !== LibraryState.ready ||
		!platform.capabilities.canPickLocalFiles
	) {
		return null;
	}

	return (
		<>
			{metadata && (
				<Sheet
					open={isModalOpen}
					onOpenChange={(open) => {
						if (!open) closeModal();
					}}
					title={addBookFormTitle}
					width={560}
				>
					<AddBookForm
						initial={{
							authorList: metadata?.author_names ?? [],
							title: metadata?.title ?? "",
						}}
						authorList={authorList}
						fileName={metadata?.path ?? ""}
						hideTitle={true}
						onCreateAuthor={onCreateAuthor}
						onSubmit={addBookByMetadataWithEffects}
					/>
				</Sheet>
			)}
			<Tooltip label="Add Book…" openDelay={500}>
				<IconButton
					aria-label="Add Book"
					onPointerDown={selectAndEditBookFile}
				>
					<svg
						width="15"
						height="15"
						viewBox="0 0 15 15"
						fill="none"
						aria-hidden="true"
					>
						<path
							d="M7.5 2v11M2 7.5h11"
							stroke="currentColor"
							strokeWidth="1.4"
							strokeLinecap="round"
						/>
					</svg>
				</IconButton>
			</Tooltip>
		</>
	);
};
