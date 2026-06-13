import type { ReactNode } from "react";
import { useAddBook } from "@/components/organisms/AddBook";
import { Button } from "@/components/ui";
import { useOpenSettings } from "@/lib/hooks/use-open-settings";
import styles from "./EmptyState.module.css";

export interface EmptyStateProps {
	/** Short heading naming what's empty or unmatched. */
	title: string;
	/** Optional soft explanatory line under the title. */
	description?: ReactNode;
	/** Action buttons, rendered in a centered row beneath the copy. */
	children?: ReactNode;
}

/**
 * Quiet, illustration-free placeholder for empty grids/lists and zero-result
 * filters (DESIGN.md: neutral chrome, no empty-state art). Fills the height of
 * its scroll container and centers a heading, optional description, and an
 * action row.
 */
export const EmptyState = ({
	title,
	description,
	children,
}: EmptyStateProps) => {
	return (
		<div className={styles.root}>
			<div className={styles.inner}>
				<h2 className={styles.title}>{title}</h2>
				{description !== undefined && (
					<p className={styles.description}>{description}</p>
				)}
				{children !== undefined && (
					<div className={styles.actions}>{children}</div>
				)}
			</div>
		</div>
	);
};

/**
 * First-run / empty-library teaching state. Names the two ways to populate the
 * library: import a book, or point Citadel at an existing Calibre library.
 * Shared by the Books and Authors pages.
 */
export const EmptyLibrary = () => {
	const { startAddBook, canAddBook } = useAddBook();
	const openSettings = useOpenSettings();

	return (
		<EmptyState
			title="Your library is empty"
			description={
				canAddBook
					? "Add a book to this library, or switch to an existing Calibre library."
					: "Switch to an existing Calibre library to get started."
			}
		>
			{canAddBook && (
				<Button variant="primary" onClick={startAddBook}>
					Add Book…
				</Button>
			)}
			<Button variant="default" onClick={openSettings}>
				Switch library…
			</Button>
		</EmptyState>
	);
};
