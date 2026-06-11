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
import { ActionIcon, Modal, Tooltip } from "@mantine/core";
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
				<Modal.Root opened={isModalOpen} onClose={closeModal} size={"lg"}>
					<Modal.Overlay blur={3} backgroundOpacity={0.35} />
					<Modal.Content
						style={{
							background: "var(--ctd-drawer-gradient)",
							border: "1px solid var(--ctd-border)",
						}}
					>
						<Modal.Header
							style={{
								backgroundColor: "transparent",
								borderBottom: "1px solid var(--ctd-border)",
							}}
						>
							<Modal.Title>{addBookFormTitle}</Modal.Title>
							<Modal.CloseButton
								style={{
									border: "1px solid var(--ctd-border)",
									backgroundColor: "var(--ctd-control-bg)",
								}}
							/>
						</Modal.Header>
						<Modal.Body style={{ paddingTop: "0.9rem" }}>
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
						</Modal.Body>
					</Modal.Content>
				</Modal.Root>
			)}
			<Tooltip label="Add Book…" openDelay={500}>
				<ActionIcon
					variant="subtle"
					color="gray"
					aria-label="Add Book"
					onPointerDown={selectAndEditBookFile}
					style={{ color: "var(--ctd-ink-soft)" }}
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
				</ActionIcon>
			</Tooltip>
		</>
	);
};
