import type {
	BookUpdate,
	LibraryAuthor,
	LibraryBook,
	HardcoverSearchResult,
} from "@/bindings";
import { commands } from "@/bindings";
import { safeAsyncEventHandler } from "@/lib/async";
import { useSettings } from "@/stores/settings/store";
import {
	ActionIcon,
	Button,
	Fieldset,
	Group,
	Paper,
	Stack,
	Switch,
	Text,
	TextInput,
	Title,
	Box,
	Alert,
	Modal,
	Image,
	Card,
	Badge,
	ScrollArea,
	Loader,
	Tooltip,
} from "@mantine/core";
import { RichTextEditor } from "@mantine/tiptap";
import { Link } from "@tiptap/extension-link";
import { useEditor } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import DOMPurify from "dompurify";
import { Form, useForm } from "@mantine/form";
import { type HTMLProps, useEffect, useMemo, useState } from "react";
import { openPath } from "@tauri-apps/plugin-opener";
import { BookCover } from "../atoms/BookCover";
import { MultiSelectCreatable } from "../atoms/Multiselect";
import styles from "./EditBook.module.css";

interface BookPageProps {
	allAuthorList: LibraryAuthor[];
	book: LibraryBook;
	onCreateAuthor: (authorName: string) => Promise<void>;
	onSave: (bookUpdate: BookUpdate) => Promise<void>;
	onDeleteIdentifier: (bookId: string, identifierId: number) => Promise<void>;
	onUpsertIdentifier: (
		bookId: string,
		identifierId: number | null,
		label: string,
		value: string,
	) => Promise<void>;
}

export const BookPage = ({
	allAuthorList,
	book,
	onCreateAuthor,
	onSave,
	onUpsertIdentifier,
	onDeleteIdentifier,
}: BookPageProps) => {
	return (
		<Stack h={"100%"}>
			<Title size="md">
				<Text fw={900} component="span">
					Editing book info
				</Text>{" "}
				– {book.title}
			</Title>
			<EditBookForm
				allAuthorList={allAuthorList}
				onCreateAuthor={onCreateAuthor}
				book={book}
				onSave={onSave}
				onDeleteIdentifier={onDeleteIdentifier}
				onUpsertIdentifier={onUpsertIdentifier}
			/>
		</Stack>
	);
};

const Formats = ({
	book,
	style,
}: { book: LibraryBook } & HTMLProps<HTMLDivElement>) => {
	return (
		<div style={style}>
			<Text size="xl">Formats</Text>
			<ul>
				{book.file_list.map((file) => {
					if ("Local" in file) {
						return (
							<li key={file.Local.mime_type}>
								<Text size="md">{file.Local.mime_type}</Text>
							</li>
						);
					}

					return (
						<li key={file.Remote.url}>
							<Text size="md">{file.Remote.url}</Text>
						</li>
					);
				})}
			</ul>
		</div>
	);
};

const Cover = ({ book }: { book: LibraryBook } & HTMLProps<HTMLDivElement>) => {
	return <BookCover book={book} disableFade />;
};

const formValuesFromBook = (book: LibraryBook) => ({
	title: book.title,
	sortTitle: book.sortable_title ?? "",
	authorList: book.author_list.map((author) => author.name),
	identifierList: book.identifier_list,
	description: book.description ?? "",
	isRead: book.is_read,
	isEditingDescription: false,
});

// How much an element has to be offset vertically to account for the lack of a
// text label.
const LABEL_OFFSET_MARGIN = "22px";

const EditBookForm = ({
	allAuthorList,
	book,
	onCreateAuthor: createAuthor,
	onSave,
	onUpsertIdentifier,
	onDeleteIdentifier,
}: {
	allAuthorList: LibraryAuthor[];
	book: LibraryBook;
	onCreateAuthor: (name: string) => Promise<void>;
	onSave: (update: BookUpdate) => Promise<void>;
	onDeleteIdentifier: (bookId: string, identifierId: number) => Promise<void>;
	onUpsertIdentifier: (
		bookId: string,
		identifierId: number | null,
		label: string,
		value: string,
	) => Promise<void>;
}) => {
	const initialValues = useMemo(() => {
		return formValuesFromBook(book);
	}, [book]);
	const form = useForm({
		initialValues,
	});
	const allAuthorNames = useMemo(
		() => allAuthorList.map((author) => author.name),
		[allAuthorList],
	);
	const [newBookIdentifierLabel, setNewBookIdentifierLabel] = useState("");

	// Hardcover integration state
	const hardcoverApiKey = useSettings((state) => state.hardcoverApiKey);
	const [isFetchingFromHardcover, setIsFetchingFromHardcover] = useState(false);
	const [hardcoverMessage, setHardcoverMessage] = useState<{
		type: "success" | "error";
		text: string;
	} | null>(null);

	// Hardcover search state
	const [isSearchModalOpen, setIsSearchModalOpen] = useState(false);
	const [searchQuery, setSearchQuery] = useState("");
	const [isSearching, setIsSearching] = useState(false);
	const [searchResults, setSearchResults] = useState<HardcoverSearchResult[]>(
		[],
	);

	// Find ISBN identifier
	const isbnIdentifier = useMemo(
		() => book.identifier_list.find((id) => id.label.toLowerCase() === "isbn"),
		[book.identifier_list],
	);

	// Find Hardcover ID identifier
	const hardcoverIdIdentifier = useMemo(
		() =>
			book.identifier_list.find((id) => id.label.toLowerCase() === "hardcover"),
		[book.identifier_list],
	);

	// Fetch metadata from Hardcover
	const fetchFromHardcover = async () => {
		if (!hardcoverApiKey) {
			setHardcoverMessage({
				type: "error",
				text: "Please configure your Hardcover API key in settings first.",
			});
			return;
		}

		if (!isbnIdentifier) {
			setHardcoverMessage({
				type: "error",
				text: "This book needs an ISBN to fetch metadata from Hardcover.",
			});
			return;
		}

		setIsFetchingFromHardcover(true);
		setHardcoverMessage(null);

		try {
			const result = await commands.fetchHardcoverMetadataByIsbn(
				hardcoverApiKey,
				isbnIdentifier.value,
			);

			if (result.status === "ok") {
				const metadata = result.data;

				// Update form with fetched data
				if (metadata.title) {
					form.setFieldValue("title", metadata.title);
				}
				if (metadata.description) {
					form.setFieldValue("description", metadata.description);
				}

				// Store Hardcover ID if we got one
				if (metadata.hardcover_id) {
					await onUpsertIdentifier(
						book.id,
						hardcoverIdIdentifier?.id ?? null,
						"hardcover",
						metadata.hardcover_id.toString(),
					);
				}

				setHardcoverMessage({
					type: "success",
					text: "Successfully fetched metadata from Hardcover!",
				});
			} else {
				setHardcoverMessage({
					type: "error",
					text: result.error,
				});
			}
		} catch (error) {
			const errorMessage =
				error instanceof Error ? error.message : String(error);
			setHardcoverMessage({
				type: "error",
				text: `Error: ${errorMessage}`,
			});
		} finally {
			setIsFetchingFromHardcover(false);
		}
	};

	// Open book in Hardcover
	const openInHardcover = async () => {
		if (!hardcoverIdIdentifier) {
			return;
		}

		try {
			const hardcoverId = hardcoverIdIdentifier.value;
			const url = `https://hardcover.app/books/${hardcoverId}`;
			await openPath(url);
		} catch (error) {
			console.error("Failed to open Hardcover URL:", error);
			const errorMessage =
				error instanceof Error ? error.message : String(error);
			setHardcoverMessage({
				type: "error",
				text: `Failed to open Hardcover: ${errorMessage}`,
			});
		}
	};

	// Search Hardcover
	const searchHardcover = async () => {
		if (!hardcoverApiKey) {
			setHardcoverMessage({
				type: "error",
				text: "Please configure your Hardcover API key in settings first.",
			});
			return;
		}

		if (!searchQuery.trim()) {
			setHardcoverMessage({
				type: "error",
				text: "Please enter a search query.",
			});
			return;
		}

		setIsSearching(true);
		setSearchResults([]);
		setHardcoverMessage(null);

		try {
			const result = await commands.searchHardcoverBooks(
				hardcoverApiKey,
				searchQuery,
			);

			if (result.status === "ok") {
				setSearchResults(result.data);
				setIsSearchModalOpen(true);
				if (result.data.length === 0) {
					setHardcoverMessage({
						type: "error",
						text: "No books found for your search query.",
					});
				}
			} else {
				setHardcoverMessage({
					type: "error",
					text: result.error,
				});
			}
		} catch (error) {
			const errorMessage =
				error instanceof Error ? error.message : String(error);
			setHardcoverMessage({
				type: "error",
				text: `Error: ${errorMessage}`,
			});
		} finally {
			setIsSearching(false);
		}
	};

	// Populate book data from a selected search result
	const selectSearchResult = async (result: HardcoverSearchResult) => {
		// Update form with fetched data
		if (result.title) {
			form.setFieldValue("title", result.title);
		}
		if (result.description) {
			form.setFieldValue("description", result.description);
		}

		// Update authors if available
		if (result.authors && result.authors.length > 0) {
			// Create any new authors that don't exist
			for (const authorName of result.authors) {
				if (!allAuthorNames.includes(authorName)) {
					await createAuthor(authorName);
				}
			}
			form.setFieldValue("authorList", result.authors);
		}

		// Store Hardcover ID
		await onUpsertIdentifier(
			book.id,
			hardcoverIdIdentifier?.id ?? null,
			"hardcover",
			result.hardcover_id.toString(),
		);

		setIsSearchModalOpen(false);
		setHardcoverMessage({
			type: "success",
			text: "Successfully populated book data from Hardcover!",
		});
	};

	const editor = useEditor({
		extensions: [
			StarterKit,
			Link.configure({
				openOnClick: false,
				HTMLAttributes: {
					target: "_blank",
					rel: "noopener noreferrer nofollow",
				},
			}),
		],
		content: form.values.description || "<p></p>",
		onUpdate: ({ editor }) => {
			const html = editor.getHTML();
			// Only update if content has actual text content, not just empty tags
			if (html && (html !== "<p></p>" || form.values.description !== "")) {
				form.setFieldValue("description", html);
			}
		},
	});

	// biome-ignore lint/correctness/useExhaustiveDependencies: Re-rendering when Form is updated causes infinite loops.
	useEffect(() => {
		form.setValues(formValuesFromBook(book));
		// Re-rendering when `form` is updated causes infinite loops
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [book]);

	useEffect(() => {
		if (editor && form.values.isEditingDescription) {
			const currentHTML = editor.getHTML();
			const formDesc = form.values.description || "<p></p>";

			if (currentHTML !== formDesc) {
				editor.commands.setContent(formDesc);
			}

			// Focus the editor when switching to edit mode
			setTimeout(() => editor.commands.focus(), 1);
		}
	}, [editor, form.values.description, form.values.isEditingDescription]);

	return (
		<Form
			form={form}
			onSubmit={safeAsyncEventHandler(async () => {
				const authorIdsFromName = form.values.authorList.map(
					(authorName) =>
						allAuthorList.find((author) => author.name === authorName)?.id ??
						"-1",
				);

				const bookUpdate: BookUpdate = {
					title: form.values.title,
					author_id_list: authorIdsFromName,
					timestamp: null,
					publication_date: null,
					is_read: form.values.isRead,
					description:
						form.values.description === "<p></p>"
							? ""
							: form.values.description,
				};

				await onSave(bookUpdate);

				form.resetDirty();
				form.resetTouched();
			})}
			style={{
				// Additional `flex: 1` on the form prevents the element from
				// overflowing when a second+ author is selected
				display: "grid",
				gridTemplateColumns: "0.3fr 1.8fr",
				gridTemplateRows: "1.4fr 1.4fr",
				gridTemplateAreas: `"Cover BookInfo"
				 "Format BookInfo"`,
				gap: "0px 1rem",
				height: "100%",
			}}
		>
			<div style={{ gridArea: "Cover" }}>
				<Stack>
					<Cover book={book} />
					<Switch
						label="Finished"
						{...form.getInputProps("isRead", { type: "checkbox" })}
					/>
				</Stack>
			</div>
			<Formats book={book} style={{ gridArea: "Format" }} />
			<Group
				align="flex-start"
				preventGrowOverflow
				style={{ gridArea: "BookInfo" }}
			>
				<Stack flex={1}>
					<Group flex={1} justify="space-between">
						<Text size="xl" p="1" h="36">
							Book info
						</Text>
						{form.isDirty() && form.isTouched() && (
							<Group justify="space-between">
								<Button
									variant="subtle"
									onClick={() => form.reset()}
									color="red"
								>
									Clear
								</Button>
								<Button type="submit" component="button">
									Save
								</Button>
							</Group>
						)}
					</Group>
					{hardcoverApiKey && (
						<Stack gap="sm">
							{isbnIdentifier && (
								<Group>
									<Button
										variant="outline"
										size="sm"
										onClick={() => void fetchFromHardcover()}
										loading={isFetchingFromHardcover}
									>
										Fetch from Hardcover
									</Button>
									{hardcoverIdIdentifier && (
										<Button
											variant="outline"
											size="sm"
											onClick={() => void openInHardcover()}
										>
											View in Hardcover
										</Button>
									)}
									<Text size="sm" c="dimmed">
										Uses ISBN: {isbnIdentifier.value}
									</Text>
								</Group>
							)}
							<Group>
								<TextInput
									placeholder="Search by title or author..."
									value={searchQuery}
									onChange={(event) => setSearchQuery(event.target.value)}
									onKeyDown={(event) => {
										if (event.key === "Enter") {
											void searchHardcover();
										}
									}}
									style={{ flex: 1 }}
								/>
								<Button
									variant="filled"
									size="sm"
									onClick={() => void searchHardcover()}
									loading={isSearching}
								>
									Search Hardcover
								</Button>
							</Group>
						</Stack>
					)}
					{hardcoverMessage && (
						<Alert
							color={hardcoverMessage.type === "success" ? "green" : "red"}
							onClose={() => setHardcoverMessage(null)}
							withCloseButton
						>
							{hardcoverMessage.text}
						</Alert>
					)}
					<Group flex={1}>
						<TextInput
							label="Title"
							flex={1}
							{...form.getInputProps("title")}
						/>
						<ActionIcon variant="outline" mt={LABEL_OFFSET_MARGIN}>
							→
						</ActionIcon>
						<TextInput
							label="Sort title"
							{...form.getInputProps("sortTitle")}
							flex={1}
						/>
					</Group>
					<MultiSelectCreatable
						label="Authors"
						selectOptions={allAuthorNames}
						onCreateSelectOption={(name) => void createAuthor(name)}
						{...form.getInputProps("authorList")}
					/>
					<Group flex={1}>
						{form.values.identifierList.length > 0 && (
							<Group flex={1}>
								<Fieldset legend="Identifiers">
									{form.values.identifierList.map(({ label, id }, index) => (
										<Group key={id} flex={1} align="center">
											<TextInput
												flex={"15ch"}
												label={label.toUpperCase()}
												{...form.getInputProps(`identifierList.${index}.value`)}
												onBlur={(event) => {
													onUpsertIdentifier(
														book.id,
														id,
														label,
														event.target.value,
													).catch(console.error);
												}}
											/>
											<ActionIcon
												variant="outline"
												color="red"
												onClick={() => {
													onDeleteIdentifier(book.id, id).catch(console.error);
												}}
												mt={LABEL_OFFSET_MARGIN}
											>
												×
											</ActionIcon>
										</Group>
									))}
									<hr style={{ color: "lightgrey" }} />
									<Group>
										<TextInput
											label="Identifier label"
											placeholder="ISBN"
											value={newBookIdentifierLabel}
											onChange={(event) =>
												setNewBookIdentifierLabel(event.target.value)
											}
										/>
										<Button
											onClick={() => {
												onUpsertIdentifier(
													book.id,
													null,
													newBookIdentifierLabel,
													"",
												)
													.then(() => setNewBookIdentifierLabel(""))
													.catch(console.error);
											}}
											variant="outline"
											color="blue"
											mt={LABEL_OFFSET_MARGIN}
										>
											Add identifier
										</Button>
									</Group>
								</Fieldset>
							</Group>
						)}
					</Group>
					<Paper shadow="sm" p="lg">
						<Group justify="space-between">
							<Text size="lg">Description</Text>
							<Button
								variant="subtle"
								onClick={() =>
									form.setFieldValue(
										"isEditingDescription",
										!form.values.isEditingDescription,
									)
								}
							>
								{form.values.isEditingDescription ? "Preview" : "Edit"}
							</Button>
						</Group>

						{form.values.isEditingDescription ? (
							<Box mt="sm" className={styles.richTextEditorContainer}>
								<Text className={styles.editorHint}>
									Type your description here. Use the formatting tools above.
								</Text>
								<RichTextEditor
									editor={editor}
									className={styles.editorWrapper}
								>
									<RichTextEditor.Toolbar sticky stickyOffset={60}>
										<RichTextEditor.ControlsGroup>
											<RichTextEditor.Bold />
											<RichTextEditor.Italic />
											<RichTextEditor.Underline />
											<RichTextEditor.Link />
										</RichTextEditor.ControlsGroup>

										<RichTextEditor.ControlsGroup>
											<RichTextEditor.BulletList />
											<RichTextEditor.OrderedList />
										</RichTextEditor.ControlsGroup>

										<RichTextEditor.ControlsGroup>
											<RichTextEditor.H1 />
											<RichTextEditor.H2 />
											<RichTextEditor.H3 />
										</RichTextEditor.ControlsGroup>

										<RichTextEditor.ControlsGroup>
											<RichTextEditor.Undo />
											<RichTextEditor.Redo />
										</RichTextEditor.ControlsGroup>
									</RichTextEditor.Toolbar>

									<RichTextEditor.Content />
								</RichTextEditor>
							</Box>
						) : (
							<Box mt="sm">
								{form.values.description ? (
									<div
										className={styles.descriptionHtml}
										// biome-ignore lint/security/noDangerouslySetInnerHtml: We sanitize with DOMPurify
										dangerouslySetInnerHTML={{
											__html: DOMPurify.sanitize(form.values.description),
										}}
									/>
								) : (
									<Text c="dimmed" fs="italic">
										No description available. Click &quot;Edit&quot; to add one.
									</Text>
								)}
							</Box>
						)}
					</Paper>
				</Stack>
			</Group>

			{/* Search Results Modal */}
			<Modal
				opened={isSearchModalOpen}
				onClose={() => setIsSearchModalOpen(false)}
				title={`Search Results for "${searchQuery}"`}
				size="xl"
			>
				<ScrollArea style={{ height: "60vh" }}>
					<Stack gap="md">
						{searchResults.length === 0 ? (
							<Text c="dimmed" ta="center">
								{isSearching ? (
									<Loader size="sm" />
								) : (
									"No results found. Try a different search query."
								)}
							</Text>
						) : (
							searchResults.map((result) => (
								<Card
									key={result.hardcover_id}
									shadow="sm"
									padding="lg"
									style={{ cursor: "pointer" }}
									onClick={() => void selectSearchResult(result)}
								>
									<Group align="flex-start" gap="md">
										{result.image_url && (
											<Image
												src={result.image_url}
												alt={result.title}
												width={100}
												height={150}
												fit="contain"
											/>
										)}
										<Stack flex={1} gap="xs">
											<Text size="lg" fw={700}>
												{result.title}
											</Text>
											{result.authors && result.authors.length > 0 && (
												<Group gap="xs">
													{result.authors.map((author) => (
														<Badge key={author} variant="light">
															{author}
														</Badge>
													))}
												</Group>
											)}
											{result.release_year && (
												<Text size="sm" c="dimmed">
													Published: {result.release_year}
												</Text>
											)}
											{result.description && (
												<Text
													size="sm"
													lineClamp={3}
													style={{ whiteSpace: "pre-wrap" }}
												>
													{result.description.replace(/<[^>]*>/g, "")}
												</Text>
											)}
										</Stack>
									</Group>
								</Card>
							))
						)}
					</Stack>
				</ScrollArea>
			</Modal>
		</Form>
	);
};
