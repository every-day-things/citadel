import { BookUpdate, LibraryAuthor, LibraryBook } from "@/bindings";
import { safeAsyncEventHandler } from "@/lib/async";
import { LibraryState, useLibrary } from "@/lib/contexts/library";
import { Library } from "@/lib/services/library";
import {
	ActionIcon,
	Button,
	Group,
	Stack,
	Text,
	TextInput,
	Title,
} from "@mantine/core";
import { Form, useForm } from "@mantine/form";
import { useMemo, useState } from "react";
import { BookCover } from "../atoms/BookCover";
import { MultiSelectCreatable } from "../atoms/Multiselect";

interface BookPageProps {
	book: LibraryBook;
	allAuthorList: LibraryAuthor[];
	library: Library;
	onSave: () => Promise<void>;
}

export const BookPage = ({
	book,
	allAuthorList,
	library,
	onSave,
}: BookPageProps) => {
	return (
		<BookPagePure
			book={book}
			library={library}
			allAuthorList={allAuthorList}
			onSave={onSave}
		/>
	);
};

interface BookPagePureProps {
	book: LibraryBook;
	library: Library;
	allAuthorList: LibraryAuthor[];
	onSave: () => Promise<void>;
}

const BookPagePure = ({ book, allAuthorList, onSave }: BookPagePureProps) => {
	return (
		<Stack h={"-webkit-fill-available"}>
			<Title size="md">
				<Text fw={900} component="span">
					Editing book info
				</Text>{" "}
				– {book.title}
			</Title>
			<Group align="flex-start" preventGrowOverflow>
				<Stack>
					<Stack>
						<Cover book={book} />
					</Stack>
					<Stack>
						<Formats book={book} />
					</Stack>
				</Stack>
				<EditBookForm
					book={book}
					allAuthorList={allAuthorList}
					onSave={onSave}
				/>
			</Group>
		</Stack>
	);
};

const Formats = ({ book }: { book: LibraryBook }) => {
	return (
		<>
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
		</>
	);
};

const Cover = ({ book }: { book: LibraryBook }) => {
	return (
		<>
			<Text size="xl">Cover</Text>
			<BookCover book={book} />
		</>
	);
};

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
	onSave: () => Promise<void>;
}) => {
	const [isSaving, setIsSaving] = useState(false);
	const initialValues = useMemo(
		() => ({
			title: book.title,
			sortTitle: book.sortable_title ?? "",
			authorList: book.author_list.map((author) => author.name),
		}),
		[book.title, book.sortable_title, book.author_list],
	);
	const form = useForm({
		initialValues,
	});
	const allAuthorNames = useMemo(
		() => allAuthorList.map((author) => author.name),
		[allAuthorList],
	);
	const { library, state } = useLibrary();

	return (
		<Form
			form={form}
			onSubmit={safeAsyncEventHandler(async () => {
				setIsSaving(true);
				if (state !== LibraryState.ready) {
					setIsSaving(false);
					return;
				}

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
				await library?.updateBook(book.id, bookUpdate);

				await onSave();
				setIsSaving(false);
			})}
			style={{
				// Additional `flex: 1` on the form prevents the element from
				// overflowing when a second+ author is selected
				flex: 1,
			}}
		>
			<Stack flex={1}>
				<Text size="xl">Book info</Text>
				<Group flex={1}>
					<TextInput label="Title" flex={1} {...form.getInputProps("title")} />
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
				<Group justify="flex-end" mt="md" gap="80px">
					<Button variant="subtle" onClick={() => form.reset()} color="red">
						Cancel
					</Button>
					<Button type="submit" loading={isSaving} disabled={isSaving}>
						Save
					</Button>
				</Group>
			</Stack>
		</Form>
	);
};
