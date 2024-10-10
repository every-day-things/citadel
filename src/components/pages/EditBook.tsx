import type { BookUpdate, LibraryAuthor, LibraryBook } from "@/bindings";
import { safeAsyncEventHandler } from "@/lib/async";
import {
	ActionIcon,
	Button,
	Fieldset,
	Group,
	Paper,
	Stack,
	Text,
	TextInput,
	Textarea,
	Title,
} from "@mantine/core";
import { Form, useForm } from "@mantine/form";
import { type HTMLProps, useEffect, useMemo } from "react";
import { BookCover } from "../atoms/BookCover";
import { MultiSelectCreatable } from "../atoms/Multiselect";

interface BookPageProps {
	book: LibraryBook;
	allAuthorList: LibraryAuthor[];
	onSave: (bookUpdate: BookUpdate) => Promise<void>;
}

export const BookPage = ({ book, allAuthorList, onSave }: BookPageProps) => {
	return (
		<BookPagePure book={book} allAuthorList={allAuthorList} onSave={onSave} />
	);
};

interface BookPagePureProps {
	book: LibraryBook;
	allAuthorList: LibraryAuthor[];
	onSave: (bookUpdate: BookUpdate) => Promise<void>;
}

const BookPagePure = ({ book, allAuthorList, onSave }: BookPagePureProps) => {
	return (
		<Stack h={"100%"}>
			<Title size="md">
				<Text fw={900} component="span">
					Editing book info
				</Text>{" "}
				– {book.title}
			</Title>
			<EditBookForm book={book} allAuthorList={allAuthorList} onSave={onSave} />
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

const Cover = ({
	book,
	style,
}: { book: LibraryBook } & HTMLProps<HTMLDivElement>) => {
	return (
		<div style={style}>
			<Text size="xl">Cover</Text>
			<BookCover book={book} />
		</div>
	);
};

const formValuesFromBook = (book: LibraryBook) => ({
	title: book.title,
	sortTitle: book.sortable_title ?? "",
	authorList: book.author_list.map((author) => author.name),
	identifierList: book.identifier_list,
	description: book.description ?? "",
});

// How much an element has to be offset vertically to account for the lack of a
// text label.
const LABEL_OFFSET_MARGIN = "22px";

const EditBookForm = ({
	book,
	allAuthorList,
	onSave,
}: {
	book: LibraryBook;
	allAuthorList: LibraryAuthor[];
	onSave: (update: BookUpdate) => Promise<void>;
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

	// biome-ignore lint/correctness/useExhaustiveDependencies: Re-rendering when Form is updated causes infinite loops.
	useEffect(() => {
		form.setValues(formValuesFromBook(book));
		// Re-rendering when `form` is updated causes infinite loops
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [book]);

	return (
		<Form
			form={form}
			onSubmit={safeAsyncEventHandler(async () => {
				const authorIdsFromName = form.values.authorList
					.map(
						(authorName) =>
							allAuthorList.find((author) => author.name === authorName)?.id ??
							"-1",
					)
					.filter((id) => id !== "-1");
				const bookUpdate: BookUpdate = {
					title: form.values.title,
					author_id_list: authorIdsFromName,
					timestamp: null,
					publication_date: null,
				};

				await onSave(bookUpdate);
			})}
			style={{
				// Additional `flex: 1` on the form prevents the element from
				// overflowing when a second+ author is selected
				display: "grid",
				gridTemplateColumns: "0.3fr 1.8fr",
				gridTemplateRows: "1.4fr 1.4fr 0.2fr",
				gridTemplateAreas: `"Cover BookInfo"
				 "Format BookInfo"
				 "Buttons Buttons"`,
				gap: "0px 1rem",
				height: "100%",
			}}
		>
			<Cover book={book} style={{ gridArea: "Cover" }} />
			<Formats book={book} style={{ gridArea: "Format" }} />
			<Group
				align="flex-start"
				preventGrowOverflow
				style={{ gridArea: "BookInfo" }}
			>
				<Stack flex={1}>
					<Text size="xl">Book info</Text>
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
					{form.values.identifierList.length > 0 && (
						<Group flex={1}>
							<Fieldset legend="Identifiers">
								{form.values.identifierList.map(({ label, value }) => (
									<Group key={`${label}-${value}`} flex={1} align="center">
										<TextInput
											flex={"15ch"}
											label={label.toUpperCase()}
											value={value}
											disabled
										/>
									</Group>
								))}
							</Fieldset>
						</Group>
					)}
					{form.values.description.length > 0 && (
						<Paper shadow="sm" p="lg">
							<Text size="lg">Description</Text>
							<Textarea disabled value={form.values.description} autosize />
						</Paper>
					)}
				</Stack>
			</Group>
			<Group
				justify="flex-end"
				mt="md"
				gap="80px"
				style={{ gridArea: "3 / 1 / 4 / 3" }}
			>
				<Button variant="subtle" onClick={() => form.reset()} color="red">
					Cancel
				</Button>
				<Button type="submit" component="button">
					Save
				</Button>
			</Group>
		</Form>
	);
};
