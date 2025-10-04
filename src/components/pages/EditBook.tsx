import type { BookUpdate, LibraryAuthor, LibraryBook } from "@/bindings";
import { safeAsyncEventHandler } from "@/lib/async";
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
} from "@mantine/core";
import { RichTextEditor } from "@mantine/tiptap";
import { Link } from "@tiptap/extension-link";
import { useEditor } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import DOMPurify from "dompurify";
import { Form, useForm } from "@mantine/form";
import { type HTMLProps, useEffect, useMemo, useState } from "react";
import { BookCover } from "../atoms/BookCover";
import { MultiSelectCreatable } from "../atoms/Multiselect";
import styles from "./EditBook.module.css";

interface BookPageProps {
	book: LibraryBook;
	allAuthorList: LibraryAuthor[];
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
	book,
	allAuthorList,
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
				book={book}
				allAuthorList={allAuthorList}
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
	book,
	allAuthorList,
	onSave,
	onUpsertIdentifier,
	onDeleteIdentifier,
}: {
	book: LibraryBook;
	allAuthorList: LibraryAuthor[];
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
				console.log(authorIdsFromName);
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
		</Form>
	);
};
