import { MultiSelectCreatable } from "@/components/atoms/Multiselect";
import { safeAsyncEventHandler } from "@/lib/async";
import { Button, Group, TextInput, Title } from "@mantine/core";
import { Form, useForm } from "@mantine/form";
import type { ReactNode } from "react";
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
	const form = useForm({
		initialValues: initial,
	});
	return (
		<Form
			form={form}
			onSubmit={() => {
				if (onSubmit) {
					safeAsyncEventHandler(async () => onSubmit(form.values))();
				}
			}}
		>
			{!hideTitle && (
				<Title order={4} mb="sm">
					{title}
				</Title>
			)}
			<div className={styles.rows}>
				<FormRow label="File">
					<SelectedFile path={fileName} />
				</FormRow>
				<FormRow label="Title" htmlFor="add-book-title">
					<TextInput id="add-book-title" {...form.getInputProps("title")} />
				</FormRow>
				<FormRow label="Authors" alignTop>
					<MultiSelectCreatable
						label="Authors"
						placeholder="Search or add author"
						selectOptions={authorList}
						onCreateSelectOption={(name) =>
							safeAsyncEventHandler(async () => onCreateAuthor(name))()
						}
						{...form.getInputProps("authorList")}
					/>
				</FormRow>
			</div>
			<Group justify="flex-end" gap="sm" mt="lg">
				{onCancel && (
					<Button variant="default" onClick={onCancel}>
						Cancel
					</Button>
				)}
				<Button variant="filled" color="accent" type="submit">
					Add Book
				</Button>
			</Group>
		</Form>
	);
};
