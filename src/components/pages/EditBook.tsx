import { Link as RouterLink } from "@tanstack/react-router";
import DOMPurify from "dompurify";
import {
	type FormEvent,
	type HTMLProps,
	type ReactNode,
	useCallback,
	useEffect,
	useMemo,
	useState,
} from "react";
import type { BookUpdate, LibraryAuthor, LibraryBook } from "@/bindings";
import { HardcoverLogo } from "@/components/icons/HardcoverLogo";
import {
	Button,
	IconButton,
	Spinner,
	Switch,
	TagsInput,
	TextInput,
	Tooltip,
} from "@/components/ui";
import { safeAsyncEventHandler } from "@/lib/async";
import { useHardcoverBookActions } from "@/lib/hooks/use-hardcover-book-actions";
import { BookCover } from "../atoms/BookCover";
import { HardcoverSearchModal } from "../molecules/HardcoverSearchModal";
import { RichTextEditor } from "../molecules/RichTextEditor";
import styles from "./EditBook.module.css";

/**
 * AppKit-style form row: right-aligned label in a fixed-width left gutter,
 * control filling the remaining width (Finder Get Info / Xcode inspectors).
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
			<div className={styles.sectionLabel}>Formats</div>
			<ul className={styles.formatList}>
				{book.file_list.map((file) => {
					if ("Local" in file) {
						return (
							<li key={file.Local.mime_type} className={styles.formatItem}>
								{file.Local.mime_type}
							</li>
						);
					}

					return (
						<li key={file.Remote.url} className={styles.formatItem}>
							{file.Remote.url}
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

interface EditBookFormValues {
	title: string;
	sortTitle: string;
	authorList: string[];
	tagList: string[];
	identifierList: LibraryBook["identifier_list"];
	description: string;
	isRead: boolean;
}

const formValuesFromBook = (book: LibraryBook): EditBookFormValues => ({
	title: book.title,
	sortTitle: book.sortable_title ?? "",
	authorList: book.author_list.map((author) => author.name),
	tagList: book.tag_list,
	identifierList: book.identifier_list,
	description: book.description ?? "",
	isRead: book.is_read,
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
	const [values, setValues] = useState<EditBookFormValues>(() =>
		formValuesFromBook(book),
	);
	// Dirty tracking: the last saved (or loaded) snapshot of the form.
	const [baseline, setBaseline] = useState<EditBookFormValues>(() =>
		formValuesFromBook(book),
	);
	const [isEditingDescription, setIsEditingDescription] = useState(false);
	const [newBookIdentifierLabel, setNewBookIdentifierLabel] = useState("");

	// Reset the form whenever the book reloads (e.g. after identifier upserts).
	useEffect(() => {
		const next = formValuesFromBook(book);
		setValues(next);
		setBaseline(next);
	}, [book]);

	const setFieldValue = useCallback((field: string, value: unknown) => {
		setValues((current) => ({ ...current, [field]: value }));
	}, []);

	// Minimal FormSetter facade for the hardcover hook.
	const form = useMemo(() => ({ setFieldValue }), [setFieldValue]);

	const allAuthorNames = useMemo(
		() => allAuthorList.map((author) => author.name),
		[allAuthorList],
	);

	const hc = useHardcoverBookActions({
		book,
		allAuthorNames,
		form,
		onUpsertIdentifier,
		onCreateAuthor: createAuthor,
		onReloadBooks,
	});

	const hasChanges = useMemo(
		() => JSON.stringify(values) !== JSON.stringify(baseline),
		[values, baseline],
	);

	const handleAuthorsChange = (next: string[]) => {
		// Authors typed in free-form that the library does not know yet get
		// created, mirroring the old MultiSelectCreatable behavior.
		for (const name of next) {
			if (!values.authorList.includes(name) && !allAuthorNames.includes(name)) {
				void createAuthor(name);
			}
		}
		setFieldValue("authorList", next);
	};

	const revert = () => {
		setValues(baseline);
		setIsEditingDescription(false);
	};

	const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
		event.preventDefault();
		safeAsyncEventHandler(async () => {
			const authorIdsFromName = values.authorList.map(
				(authorName) =>
					allAuthorList.find((author) => author.name === authorName)?.id ??
					"-1",
			);

			const bookUpdate: BookUpdate = {
				title: values.title,
				author_id_list: authorIdsFromName,
				tag_list: values.tagList,
				timestamp: null,
				publication_date: null,
				is_read: values.isRead,
				description: values.description === "<p></p>" ? "" : values.description,
			};

			await onSave(bookUpdate);

			setBaseline(values);
		})();
	};

	return (
		<form className={styles.page} onSubmit={handleSubmit}>
			<header className={styles.pageHeader}>
				<div className={styles.headerLead}>
					<Tooltip label="Back to library">
						<RouterLink
							to="/"
							aria-label="Back to library"
							className={styles.backLink}
						>
							<BackChevron />
						</RouterLink>
					</Tooltip>
					<h3 className={styles.pageTitle}>{book.title}</h3>
				</div>
				<div className={styles.headerActions}>
					{hasChanges && (
						<Button variant="subtle" onClick={revert}>
							Revert
						</Button>
					)}
					<Button variant="primary" type="submit" disabled={!hasChanges}>
						Save
					</Button>
				</div>
			</header>
			{hc.hardcoverMessage && (
				<div
					role="alert"
					className={`${styles.notice} ${
						hc.hardcoverMessage.type === "success"
							? styles.noticeSuccess
							: styles.noticeError
					}`}
				>
					<span className={styles.noticeText}>{hc.hardcoverMessage.text}</span>
					<IconButton
						aria-label="Dismiss"
						className={styles.noticeClose}
						onClick={() => hc.setHardcoverMessage(null)}
					>
						×
					</IconButton>
				</div>
			)}
			<div className={styles.layout}>
				<div className={styles.sideColumn}>
					<Cover book={book} />
					<div className={styles.finishedRow}>
						<label
							className={styles.finishedLabel}
							htmlFor="edit-book-finished"
						>
							Finished
						</label>
						<Switch
							id="edit-book-finished"
							checked={values.isRead}
							onCheckedChange={(checked) => setFieldValue("isRead", checked)}
						/>
					</div>
					<Formats book={book} className={styles.sideSection} />
				</div>
				<div className={styles.formColumn}>
					<section className={styles.section}>
						<FormRow label="Title" htmlFor="edit-book-title">
							<TextInput
								id="edit-book-title"
								value={values.title}
								onChange={(event) => setFieldValue("title", event.target.value)}
							/>
						</FormRow>
						<FormRow label="Sort title" htmlFor="edit-book-sort-title">
							<TextInput
								id="edit-book-sort-title"
								value={values.sortTitle}
								onChange={(event) =>
									setFieldValue("sortTitle", event.target.value)
								}
							/>
						</FormRow>
					</section>
					<section className={styles.section}>
						<FormRow label="Authors" alignTop htmlFor="edit-book-authors">
							<TagsInput
								id="edit-book-authors"
								aria-label="Authors"
								placeholder="Search or add author"
								suggestions={allAuthorNames}
								value={values.authorList}
								onChange={handleAuthorsChange}
							/>
						</FormRow>
						<FormRow label="Tags" alignTop htmlFor="edit-book-tags">
							<TagsInput
								id="edit-book-tags"
								aria-label="Tags"
								placeholder="Search or add tag"
								suggestions={allTagList}
								value={values.tagList}
								onChange={(next) => setFieldValue("tagList", next)}
							/>
						</FormRow>
					</section>
					<section className={styles.section}>
						<div className={styles.sectionLabel}>Identifiers</div>
						<div className={styles.sectionBody}>
							{values.identifierList.map(({ label, id, value }, index) => (
								<FormRow
									key={id}
									label={label.toUpperCase()}
									htmlFor={`edit-book-identifier-${id}`}
								>
									<div className={styles.inlineControls}>
										<TextInput
											id={`edit-book-identifier-${id}`}
											className={styles.flexGrow}
											value={value}
											onChange={(event) => {
												const nextList = values.identifierList.map(
													(identifier, candidateIndex) =>
														candidateIndex === index
															? { ...identifier, value: event.target.value }
															: identifier,
												);
												setFieldValue("identifierList", nextList);
											}}
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
												<IconButton
													aria-label="Look up metadata"
													disabled={hc.isFetchingFromHardcover}
													onClick={() => void hc.fetchFromHardcover()}
												>
													{hc.isFetchingFromHardcover ? (
														<Spinner size={12} />
													) : (
														"↓"
													)}
												</IconButton>
											</Tooltip>
										)}
										{label.toLowerCase() === "hardcover" && (
											<Tooltip label="View on Hardcover">
												<IconButton
													aria-label="View on Hardcover"
													onClick={() => void hc.openInHardcover()}
												>
													↗
												</IconButton>
											</Tooltip>
										)}
										<Tooltip label="Remove identifier">
											<IconButton
												aria-label="Remove identifier"
												className={styles.dangerIcon}
												onClick={() => {
													onDeleteIdentifier(book.id, id).catch(console.error);
												}}
											>
												×
											</IconButton>
										</Tooltip>
									</div>
								</FormRow>
							))}
							<FormRow
								label="New identifier"
								htmlFor="edit-book-new-identifier"
							>
								<div className={styles.inlineControls}>
									<TextInput
										id="edit-book-new-identifier"
										placeholder="ISBN"
										className={styles.flexGrow}
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
								</div>
							</FormRow>
						</div>
					</section>
					{hc.hardcoverApiKey && (
						<section className={styles.section}>
							<FormRow label="Hardcover">
								<Button
									variant="default"
									onClick={() => {
										const query = values.title || "";
										hc.setSearchQuery(query);
										hc.setIsSearchModalOpen(true);
										if (query) {
											void hc.searchHardcover(query);
										}
									}}
								>
									<HardcoverLogo
										width={14}
										height={14}
										aria-hidden="true"
										focusable="false"
									/>
									Find on Hardcover…
								</Button>
							</FormRow>
						</section>
					)}
					<section className={styles.section}>
						<div className={styles.sectionHeader}>
							<div className={styles.sectionLabel}>Description</div>
							<Button
								size="sm"
								variant="default"
								onClick={() => setIsEditingDescription(!isEditingDescription)}
							>
								{isEditingDescription ? "Preview" : "Edit"}
							</Button>
						</div>

						{isEditingDescription ? (
							<div className={styles.sectionBody}>
								<RichTextEditor
									aria-label="Description"
									autoFocus
									value={values.description}
									onChange={(html) => setFieldValue("description", html)}
								/>
							</div>
						) : (
							<div className={styles.sectionBody}>
								{values.description ? (
									<div
										className={styles.descriptionHtml}
										// biome-ignore lint/security/noDangerouslySetInnerHtml: We sanitize with DOMPurify
										dangerouslySetInnerHTML={{
											__html: DOMPurify.sanitize(values.description),
										}}
									/>
								) : (
									<p className={styles.emptyText}>
										No description. Choose Edit to add one.
									</p>
								)}
							</div>
						)}
					</section>
				</div>
			</div>

			{/* Hardcover search sheet */}
			<HardcoverSearchModal
				open={hc.isSearchModalOpen}
				onOpenChange={hc.setIsSearchModalOpen}
				query={hc.searchQuery}
				onQueryChange={hc.setSearchQuery}
				onSearch={() => void hc.searchHardcover()}
				isSearching={hc.isSearching}
				results={hc.searchResults}
				onSelect={(result) => void hc.selectSearchResult(result)}
				error={
					hc.hardcoverMessage?.type === "error"
						? hc.hardcoverMessage.text
						: null
				}
			/>
		</form>
	);
};
