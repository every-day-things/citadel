import type { BookUpdate, LibraryAuthor, LibraryBook } from "@/bindings";
import { safeAsyncEventHandler } from "@/lib/async";
import { useHardcoverBookActions } from "@/lib/hooks/use-hardcover-book-actions";
import {
	ActionIcon,
	Alert,
	Button,
	Group,
	Image,
	Loader,
	Modal,
	ScrollArea,
	Stack,
	Switch,
	Text,
	TextInput,
	Title,
	Tooltip,
	UnstyledButton,
} from "@mantine/core";
import { Form, useForm } from "@mantine/form";
import { RichTextEditor } from "@mantine/tiptap";
import { Link as RouterLink } from "@tanstack/react-router";
import { Link } from "@tiptap/extension-link";
import { useEditor } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import DOMPurify from "dompurify";
import { type HTMLProps, useEffect, useMemo, useState } from "react";
import { BookCover } from "../atoms/BookCover";
import { MultiSelectCreatable } from "../atoms/Multiselect";
import styles from "./EditBook.module.css";

const richTextEditorClassNames = {
	toolbar: styles.editorToolbar,
	content: styles.editorContent,
	controlsGroup: styles.editorControlsGroup,
	control: styles.editorControl,
	controlIcon: styles.editorControlIcon,
} as const;

const quietInputStyles = {
	label: {
		fontWeight: 600,
		color: "var(--ctd-ink-soft)",
	},
	input: {
		backgroundColor: "var(--ctd-control-bg)",
		borderColor: "var(--ctd-border)",
		color: "var(--ctd-control-text)",
	},
} as const;

const quietLabelStyles = {
	label: {
		fontWeight: 600,
		color: "var(--ctd-ink-soft)",
	},
} as const;

interface BookPageProps {
	allAuthorList: LibraryAuthor[];
	allTagList: string[];
	book: LibraryBook;
	onCreateAuthor: (authorName: string) => Promise<void>;
	onSave: (bookUpdate: BookUpdate) => Promise<void>;
	onDeleteIdentifier: (bookId: string, identifierId: number) => Promise<void>;
	onReloadBooks: () => Promise<void>;
	onUpsertIdentifier: (
		bookId: string,
		identifierId: number | null,
		label: string,
		value: string,
	) => Promise<void>;
}

export const BookPage = ({
	allAuthorList,
	allTagList,
	book,
	onCreateAuthor,
	onSave,
	onUpsertIdentifier,
	onDeleteIdentifier,
	onReloadBooks,
}: BookPageProps) => {
	return (
		<EditBookForm
			allAuthorList={allAuthorList}
			allTagList={allTagList}
			onCreateAuthor={onCreateAuthor}
			book={book}
			onSave={onSave}
			onDeleteIdentifier={onDeleteIdentifier}
			onReloadBooks={onReloadBooks}
			onUpsertIdentifier={onUpsertIdentifier}
		/>
	);
};

const BackChevron = () => (
	<svg
		width="14"
		height="14"
		viewBox="0 0 24 24"
		fill="none"
		stroke="currentColor"
		strokeWidth="2.5"
		strokeLinecap="round"
		strokeLinejoin="round"
		aria-hidden="true"
	>
		<path d="M15 18l-6-6 6-6" />
	</svg>
);

const Formats = ({
	book,
	style,
	...props
}: { book: LibraryBook } & HTMLProps<HTMLDivElement>) => {
	return (
		<div style={style} {...props}>
			<Text className={styles.sectionLabel}>Formats</Text>
			<ul className={styles.formatList}>
				{book.file_list.map((file) => {
					if ("Local" in file) {
						return (
							<li key={file.Local.mime_type}>
								<Text size="sm">{file.Local.mime_type}</Text>
							</li>
						);
					}

					return (
						<li key={file.Remote.url}>
							<Text size="sm">{file.Remote.url}</Text>
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
	tagList: book.tag_list,
	identifierList: book.identifier_list,
	description: book.description ?? "",
	isRead: book.is_read,
	isEditingDescription: false,
});

const EditBookForm = ({
	allAuthorList,
	allTagList,
	book,
	onCreateAuthor: createAuthor,
	onSave,
	onUpsertIdentifier,
	onDeleteIdentifier,
	onReloadBooks,
}: {
	allAuthorList: LibraryAuthor[];
	allTagList: string[];
	book: LibraryBook;
	onCreateAuthor: (name: string) => Promise<void>;
	onSave: (update: BookUpdate) => Promise<void>;
	onDeleteIdentifier: (bookId: string, identifierId: number) => Promise<void>;
	onReloadBooks: () => Promise<void>;
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
	const tagOptions = useMemo(() => allTagList, [allTagList]);
	const [newBookIdentifierLabel, setNewBookIdentifierLabel] = useState("");

	const hc = useHardcoverBookActions({
		book,
		allAuthorNames,
		form,
		onUpsertIdentifier,
		onCreateAuthor: createAuthor,
		onReloadBooks,
	});

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

	const hasChanges = form.isDirty() && form.isTouched();

	return (
		<Form
			form={form}
			className={styles.page}
			onSubmit={safeAsyncEventHandler(async () => {
				const authorIdsFromName = form.values.authorList.map(
					(authorName) =>
						allAuthorList.find((author) => author.name === authorName)?.id ??
						"-1",
				);

				const bookUpdate: BookUpdate = {
					title: form.values.title,
					author_id_list: authorIdsFromName,
					tag_list: form.values.tagList,
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
		>
			<header className={styles.pageHeader}>
				<Group gap={4} wrap="nowrap" className={styles.headerLead}>
					<Tooltip label="Back to library">
						<RouterLink
							to="/"
							aria-label="Back to library"
							className={styles.backLink}
						>
							<ActionIcon
								component="span"
								variant="subtle"
								color="gray"
								size="sm"
							>
								<BackChevron />
							</ActionIcon>
						</RouterLink>
					</Tooltip>
					<Title order={3} lineClamp={1} className={styles.pageTitle}>
						{book.title}
					</Title>
				</Group>
				<Group gap="xs" wrap="nowrap">
					{hasChanges && (
						<Button variant="subtle" onClick={() => form.reset()}>
							Revert
						</Button>
					)}
					<Button type="submit" disabled={!hasChanges}>
						Save
					</Button>
				</Group>
			</header>
			{hc.hardcoverMessage && (
				<Alert
					className={styles.notice}
					color={hc.hardcoverMessage.type === "success" ? "green" : "red"}
					onClose={() => hc.setHardcoverMessage(null)}
					withCloseButton
				>
					{hc.hardcoverMessage.text}
				</Alert>
			)}
			<div className={styles.layout}>
				<Stack gap="sm" className={styles.sideColumn}>
					<Cover book={book} />
					<Switch
						label="Finished"
						styles={quietLabelStyles}
						{...form.getInputProps("isRead", { type: "checkbox" })}
					/>
					<Formats book={book} className={styles.sideSection} />
				</Stack>
				<div className={styles.formColumn}>
					<section className={styles.section}>
						<Group gap="md" align="flex-start">
							<TextInput
								label="Title"
								flex={2}
								styles={quietInputStyles}
								{...form.getInputProps("title")}
							/>
							<TextInput
								label="Sort title"
								flex={1}
								styles={quietInputStyles}
								{...form.getInputProps("sortTitle")}
							/>
						</Group>
					</section>
					<section className={styles.section}>
						<Stack gap="sm">
							<MultiSelectCreatable
								label="Authors"
								placeholder="Search or add author"
								selectOptions={allAuthorNames}
								onCreateSelectOption={(name) => void createAuthor(name)}
								{...form.getInputProps("authorList")}
							/>
							<MultiSelectCreatable
								label="Tags"
								placeholder="Search or add tag"
								selectOptions={tagOptions}
								{...form.getInputProps("tagList")}
							/>
						</Stack>
					</section>
					<section className={styles.section}>
						<Text className={styles.sectionLabel}>Identifiers</Text>
						<Stack gap="xs" className={styles.sectionBody}>
							{form.values.identifierList.map(({ label, id }, index) => (
								<Group key={id} gap="xs" align="flex-end" wrap="nowrap">
									<TextInput
										label={label.toUpperCase()}
										flex={1}
										styles={quietInputStyles}
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
									{hc.hardcoverApiKey && label.toLowerCase() === "isbn" && (
										<Tooltip label="Look up metadata">
											<ActionIcon
												variant="subtle"
												color="gray"
												size="input-sm"
												onClick={() => void hc.fetchFromHardcover()}
												loading={hc.isFetchingFromHardcover}
											>
												↓
											</ActionIcon>
										</Tooltip>
									)}
									{label.toLowerCase() === "hardcover" && (
										<Tooltip label="View on Hardcover">
											<ActionIcon
												variant="subtle"
												color="gray"
												size="input-sm"
												onClick={() => void hc.openInHardcover()}
											>
												↗
											</ActionIcon>
										</Tooltip>
									)}
									<Tooltip label="Remove identifier">
										<ActionIcon
											variant="subtle"
											color="red"
											size="input-sm"
											onClick={() => {
												onDeleteIdentifier(book.id, id).catch(console.error);
											}}
										>
											×
										</ActionIcon>
									</Tooltip>
								</Group>
							))}
							<Group gap="xs" align="flex-end" wrap="nowrap">
								<TextInput
									label="New identifier"
									placeholder="ISBN"
									styles={quietInputStyles}
									value={newBookIdentifierLabel}
									onChange={(event) =>
										setNewBookIdentifierLabel(event.target.value)
									}
								/>
								<Button
									variant="default"
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
								>
									Add
								</Button>
							</Group>
						</Stack>
					</section>
					{hc.hardcoverApiKey && (
						<section className={styles.section}>
							<Text className={styles.sectionLabel}>Hardcover</Text>
							<Group className={styles.sectionBody}>
								<Button
									variant="default"
									onClick={() => {
										const query = form.values.title || "";
										hc.setSearchQuery(query);
										hc.setIsSearchModalOpen(true);
										if (query) {
											void hc.searchHardcover(query);
										}
									}}
								>
									Find on Hardcover…
								</Button>
							</Group>
						</section>
					)}
					<section className={styles.section}>
						<Group justify="space-between" align="center">
							<Text className={styles.sectionLabel}>Description</Text>
							<Button
								size="xs"
								variant="default"
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
							<div className={styles.sectionBody}>
								<RichTextEditor
									editor={editor}
									className={styles.editorWrapper}
									classNames={richTextEditorClassNames}
								>
									{/* Offset clears the sticky page header (12px + 36px button row + 12px + 1px rule) inside the scrolling panel. */}
									<RichTextEditor.Toolbar sticky stickyOffset={61}>
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
							</div>
						) : (
							<div className={styles.sectionBody}>
								{form.values.description ? (
									<div
										className={styles.descriptionHtml}
										// biome-ignore lint/security/noDangerouslySetInnerHtml: We sanitize with DOMPurify
										dangerouslySetInnerHTML={{
											__html: DOMPurify.sanitize(form.values.description),
										}}
									/>
								) : (
									<Text size="sm" c="dimmed">
										No description. Choose Edit to add one.
									</Text>
								)}
							</div>
						)}
					</section>
				</div>
			</div>

			{/* Hardcover Search Modal */}
			<Modal
				opened={hc.isSearchModalOpen}
				onClose={() => hc.setIsSearchModalOpen(false)}
				title="Find on Hardcover"
				size="xl"
			>
				<Stack gap="sm">
					<Group gap="xs">
						<TextInput
							placeholder="Search by title or author…"
							styles={quietInputStyles}
							value={hc.searchQuery}
							onChange={(event) => hc.setSearchQuery(event.target.value)}
							onKeyDown={(event) => {
								if (event.key === "Enter") {
									void hc.searchHardcover();
								}
							}}
							style={{ flex: 1 }}
						/>
						<Button
							onClick={() => void hc.searchHardcover()}
							loading={hc.isSearching}
						>
							Search
						</Button>
					</Group>
					<ScrollArea style={{ height: "55vh" }}>
						<Stack gap={0}>
							{hc.searchResults.length === 0 ? (
								<Text c="dimmed" ta="center" size="sm" py="md">
									{hc.isSearching ? (
										<Loader size="sm" />
									) : hc.searchQuery ? (
										"No results found. Try a different search query."
									) : (
										"Enter a title or author name to search."
									)}
								</Text>
							) : (
								hc.searchResults.map((result) => (
									<UnstyledButton
										key={result.hardcover_id}
										className={styles.searchResult}
										onClick={() => void hc.selectSearchResult(result)}
									>
										<Group align="flex-start" gap="md" wrap="nowrap">
											{result.image_url && (
												<Image
													src={result.image_url}
													alt={result.title}
													w={60}
													h={90}
													fit="contain"
												/>
											)}
											<Stack flex={1} gap={4}>
												<Text size="sm" fw={600}>
													{result.title}
												</Text>
												{result.authors && result.authors.length > 0 && (
													<Text size="xs" c="dimmed">
														{result.authors.join(", ")}
													</Text>
												)}
												{result.release_year && (
													<Text size="xs" c="dimmed">
														Published {result.release_year}
													</Text>
												)}
												{result.description && (
													<Text size="xs" c="dimmed" lineClamp={2}>
														{result.description.replace(/<[^>]*>/g, "")}
													</Text>
												)}
											</Stack>
										</Group>
									</UnstyledButton>
								))
							)}
						</Stack>
					</ScrollArea>
				</Stack>
			</Modal>
		</Form>
	);
};
