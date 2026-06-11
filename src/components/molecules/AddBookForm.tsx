import { type ReactNode, useState } from "react";
import { Button, TagsInput, TextInput } from "@/components/ui";
import { safeAsyncEventHandler } from "@/lib/async";
import styles from "./AddBookForm.module.css";

export interface AddBookForm {
	title: string;
	authorList: string[];
}

export interface AddBookFormProps {
	initial: AddBookForm;
	authorList: string[];
	fileName: string;
	onCreateAuthor: (newAuthorName: string) => Promise<void>;
	onSubmit?: (formData: AddBookForm) => Promise<void>;
	onCancel?: () => void;
	hideTitle?: boolean;
}

export const title = "Add Book";

/**
 * AppKit-style form row (Finder Get Info / Xcode inspectors): right-aligned
 * label in a fixed-width left gutter, control filling the remaining width.
 */
const FormRow = ({
	label,
	htmlFor,
	alignTop,
	children,
}: {
	label: string;
	htmlFor?: string;
	alignTop?: boolean;
	children: ReactNode;
}) => (
	<div
		className={
			alignTop ? `${styles.formRow} ${styles.formRowTop}` : styles.formRow
		}
	>
		<label className={styles.rowLabel} htmlFor={htmlFor}>
			{label}
		</label>
		<div className={styles.rowControl}>{children}</div>
	</div>
);

/**
 * One truncating line: dimmed directory that gives way first, emphasized
 * filename that stays readable. The full path is recoverable via `title`.
 */
const SelectedFile = ({ path }: { path: string }) => {
	const separatorIndex = Math.max(
		path.lastIndexOf("/"),
		path.lastIndexOf("\\"),
	);
	const directory = path.slice(0, separatorIndex + 1);
	const fileName = path.slice(separatorIndex + 1);
	return (
		<div className={styles.filePath} title={path}>
			{directory && <span className={styles.fileDir}>{directory}</span>}
			<span className={styles.fileName}>{fileName}</span>
		</div>
	);
};

export const AddBookForm = ({
	initial,
	authorList,
	onSubmit,
	onCancel,
	fileName,
	onCreateAuthor,
	hideTitle = false,
}: AddBookFormProps) => {
	const [bookTitle, setBookTitle] = useState(initial.title);
	const [bookAuthors, setBookAuthors] = useState<string[]>(initial.authorList);

	const handleAuthorsChange = (next: string[]) => {
		// Mirror the old creatable multiselect: committing a token that is not
		// an existing library author creates that author on the spot.
		for (const name of next) {
			if (
				!bookAuthors.includes(name) &&
				!authorList.some(
					(author) => author.toLowerCase() === name.toLowerCase(),
				)
			) {
				safeAsyncEventHandler(async () => onCreateAuthor(name))();
			}
		}
		setBookAuthors(next);
	};

	return (
		<form
			onSubmit={(event) => {
				event.preventDefault();
				if (onSubmit) {
					safeAsyncEventHandler(async () =>
						onSubmit({ title: bookTitle, authorList: bookAuthors }),
					)();
				}
			}}
		>
			{!hideTitle && <h4 className={styles.formTitle}>{title}</h4>}
			<div className={styles.rows}>
				<FormRow label="File">
					<SelectedFile path={fileName} />
				</FormRow>
				<FormRow label="Title" htmlFor="add-book-title">
					<TextInput
						id="add-book-title"
						value={bookTitle}
						onChange={(event) => setBookTitle(event.currentTarget.value)}
					/>
				</FormRow>
				<FormRow label="Authors" htmlFor="add-book-authors" alignTop>
					<TagsInput
						id="add-book-authors"
						placeholder="Search or add author"
						suggestions={authorList}
						value={bookAuthors}
						onChange={handleAuthorsChange}
					/>
				</FormRow>
			</div>
			<div className={styles.footer}>
				{onCancel && (
					<Button variant="default" onClick={onCancel}>
						Cancel
					</Button>
				)}
				<Button variant="primary" type="submit">
					Add Book
				</Button>
			</div>
		</form>
	);
};
