import { type ReactNode, useEffect, useState } from "react";
import { HardcoverLogo } from "@/components/icons/HardcoverLogo";
import { HardcoverSearchModal } from "@/components/molecules/HardcoverSearchModal";
import {
	Button,
	IconButton,
	TagsInput,
	TextInput,
	Tooltip,
} from "@/components/ui";
import { safeAsyncEventHandler } from "@/lib/async";
import {
	buildSearchQuery,
	type PendingHardcoverMetadata,
} from "@/lib/hardcover-import";
import { useHardcoverImportLookup } from "@/lib/hooks/use-hardcover-import-lookup";
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
	/** The imported file's embedded identifier (e.g. an ISBN from an EPUB). */
	fileIdentifier?: string | null;
	onPendingHardcoverChange?: (pending: PendingHardcoverMetadata | null) => void;
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

const DismissGlyph = () => (
	<svg
		width="10"
		height="10"
		viewBox="0 0 10 10"
		fill="none"
		aria-hidden="true"
	>
		<path
			d="M1.5 1.5l7 7M8.5 1.5l-7 7"
			stroke="currentColor"
			strokeWidth="1.4"
			strokeLinecap="round"
		/>
	</svg>
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
	fileIdentifier = null,
	onPendingHardcoverChange,
}: AddBookFormProps) => {
	const [bookTitle, setBookTitle] = useState(initial.title);
	const [bookAuthors, setBookAuthors] = useState<string[]>(initial.authorList);
	// Track which fields the user has touched so the automatic on-mount
	// Hardcover lookup never clobbers their edits.
	const [titleEdited, setTitleEdited] = useState(false);
	const [authorsEdited, setAuthorsEdited] = useState(false);

	const hc = useHardcoverImportLookup({ fileIdentifier });

	// biome-ignore lint/correctness/useExhaustiveDependencies: only react to pending changing; onPendingHardcoverChange's identity is not stable.
	useEffect(() => {
		if (hc.pending) {
			// The automatic on-mount lookup must not clobber fields the user has
			// already edited; explicit lookups/selections always win.
			const isAuto = hc.pendingSource === "auto";
			if (hc.pending.title && !(isAuto && titleEdited)) {
				setBookTitle(hc.pending.title);
			}
			if (hc.pending.authors.length > 0 && !(isAuto && authorsEdited)) {
				setBookAuthors(hc.pending.authors);
			}
		}
		onPendingHardcoverChange?.(hc.pending);
	}, [hc.pending, hc.pendingSource]);

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
		setAuthorsEdited(true);
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
						onChange={(event) => {
							setTitleEdited(true);
							setBookTitle(event.currentTarget.value);
						}}
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
				{hc.hardcoverApiKey && (
					<FormRow label="Hardcover">
						<Button
							variant="default"
							onClick={() =>
								hc.openSearch(buildSearchQuery(bookTitle, bookAuthors))
							}
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
				)}
				{hc.pending ? (
					<div className={styles.formRow}>
						<span aria-hidden="true" />
						<div
							className={`${styles.rowControl} ${styles.hardcoverNote}`}
							role="status"
						>
							<span className={styles.hardcoverNoteText}>
								Matched{" "}
								<span className={styles.hardcoverNoteTitle}>
									“{hc.pending.title}”
								</span>
								. Cover and description will be added on import.
							</span>
							<Tooltip label="Remove match">
								<IconButton
									className={styles.hardcoverNoteDismiss}
									aria-label="Remove Hardcover match"
									onClick={hc.clearPending}
								>
									<DismissGlyph />
								</IconButton>
							</Tooltip>
						</div>
					</div>
				) : (
					hc.message && (
						<div className={styles.formRow}>
							<span aria-hidden="true" />
							<div
								className={`${styles.rowControl} ${styles.hardcoverNote}`}
								data-tone="error"
								role="status"
							>
								<span className={styles.hardcoverNoteText}>
									{hc.message.text}
								</span>
								<Tooltip label="Dismiss">
									<IconButton
										className={styles.hardcoverNoteDismiss}
										aria-label="Dismiss message"
										onClick={hc.clearMessage}
									>
										<DismissGlyph />
									</IconButton>
								</Tooltip>
							</div>
						</div>
					)
				)}
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
			<HardcoverSearchModal
				open={hc.isSearchModalOpen}
				onOpenChange={(open) => {
					if (!open) hc.closeSearchModal();
				}}
				query={hc.searchQuery}
				onQueryChange={hc.setSearchQuery}
				onSearch={() => void hc.searchHardcover()}
				isSearching={hc.isSearching}
				results={hc.searchResults}
				isbnMatchId={hc.isbnMatchId}
				onSelect={(result) => void hc.selectSearchResult(result)}
				error={hc.message?.type === "error" ? hc.message.text : null}
				width={640}
			/>
		</form>
	);
};
