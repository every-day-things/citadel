import type {
	BookUpdate,
	HardcoverSearchResult,
	LibraryAuthor,
	LibraryBook,
} from "@/bindings";
import { commands } from "@/bindings";
import { safeAsyncEventHandler } from "@/lib/async";
import { useSettings } from "@/stores/settings/store";
import {
	ActionIcon,
	Alert,
	Badge,
	Box,
	Button,
	Card,
	Fieldset,
	Group,
	Image,
	Loader,
	Modal,
	Paper,
	ScrollArea,
	Stack,
	Switch,
	Text,
	TextInput,
	Title,
	Tooltip,
} from "@mantine/core";
import { Form, useForm } from "@mantine/form";
import { RichTextEditor } from "@mantine/tiptap";
import { openPath } from "@tauri-apps/plugin-opener";
import { Link } from "@tiptap/extension-link";
import { useEditor } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import DOMPurify from "dompurify";
import { type HTMLProps, useEffect, useMemo, useState } from "react";
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

				// Store Hardcover slug as identifier first (triggers book reload + form reset)
				const slug = metadata.slug ?? metadata.hardcover_id?.toString();
				if (slug) {
					await onUpsertIdentifier(
						book.id,
						hardcoverIdIdentifier?.id ?? null,
						"hardcover",
						slug,
					);
				}

				// Yield a microtask so React can flush the state update from
				// onUpsertIdentifier (which triggers book reload → useEffect resets form).
				// Not a hard guarantee, but sufficient in practice with React's sync rendering.
				await new Promise((r) => setTimeout(r, 0));

				// Now set form values (after the reset from the book reload)
				if (metadata.title) {
					form.setFieldValue("title", metadata.title);
				}
				if (metadata.description) {
					form.setFieldValue("description", metadata.description);
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
			const slug = hardcoverIdIdentifier.value;
			if (!/^[a-z0-9-]+$/.test(slug)) {
				setHardcoverMessage({
					type: "error",
					text: "Invalid Hardcover identifier — expected a slug like 'the-forever-war'",
				});
				return;
			}
			const url = `https://hardcover.app/books/${slug}`;
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
	const searchHardcover = async (queryOverride?: string) => {
		const query = queryOverride ?? searchQuery;

		if (!hardcoverApiKey) {
			setHardcoverMessage({
				type: "error",
				text: "Please configure your Hardcover API key in settings first.",
			});
			return;
		}

		if (!query.trim()) {
			return;
		}

		setIsSearching(true);
		setSearchResults([]);
		setHardcoverMessage(null);

		try {
			const result = await commands.searchHardcoverBooks(
				hardcoverApiKey,
				query,
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
		// Create any new authors first
		if (result.authors && result.authors.length > 0) {
			for (const authorName of result.authors) {
				if (!allAuthorNames.includes(authorName)) {
					await createAuthor(authorName);
				}
			}
		}

		// Store Hardcover slug as identifier (triggers book reload + form reset)
		const slug = result.slug ?? result.hardcover_id.toString();
		await onUpsertIdentifier(
			book.id,
			hardcoverIdIdentifier?.id ?? null,
			"hardcover",
			slug,
		);

		// Yield a microtask so React can flush the state update from
		// onUpsertIdentifier (which triggers book reload → useEffect resets form).
		// Not a hard guarantee, but sufficient in practice with React's sync rendering.
		await new Promise((r) => setTimeout(r, 0));

		// Now set form values (after the reset from the book reload)
		if (result.title) {
			form.setFieldValue("title", result.title);
		}
		if (result.description) {
			form.setFieldValue("description", result.description);
		}
		if (result.authors && result.authors.length > 0) {
			form.setFieldValue("authorList", result.authors);
		}

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
											{hardcoverApiKey && label.toLowerCase() === "isbn" && (
												<Tooltip label="Look up metadata">
													<ActionIcon
														variant="subtle"
														onClick={() => void fetchFromHardcover()}
														loading={isFetchingFromHardcover}
														mt={LABEL_OFFSET_MARGIN}
													>
														↓
													</ActionIcon>
												</Tooltip>
											)}
											{label.toLowerCase() === "hardcover" && (
												<Tooltip label="View on Hardcover">
													<ActionIcon
														variant="subtle"
														onClick={() => void openInHardcover()}
														mt={LABEL_OFFSET_MARGIN}
													>
														↗
													</ActionIcon>
												</Tooltip>
											)}
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
					{hardcoverApiKey && (
						<Text
							size="sm"
							c="dimmed"
							style={{ cursor: "pointer" }}
							td="underline"
							onClick={() => {
								const query = form.values.title || "";
								setSearchQuery(query);
								setIsSearchModalOpen(true);
								if (query) {
									void searchHardcover(query);
								}
							}}
						>
							Find on Hardcover...
						</Text>
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

			{/* Hardcover Search Modal */}
			<Modal
				opened={isSearchModalOpen}
				onClose={() => setIsSearchModalOpen(false)}
				title="Find on Hardcover"
				size="xl"
			>
				<Stack gap="md">
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
							variant="light"
							size="sm"
							onClick={() => void searchHardcover()}
							loading={isSearching}
						>
							Search
						</Button>
					</Group>
					<ScrollArea style={{ height: "55vh" }}>
						<Stack gap="md">
							{searchResults.length === 0 ? (
								<Text c="dimmed" ta="center">
									{isSearching ? (
										<Loader size="sm" />
									) : searchQuery ? (
										"No results found. Try a different search query."
									) : (
										"Enter a title or author name to search."
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
				</Stack>
			</Modal>
		</Form>
	);
};
