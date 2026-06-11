import type { HardcoverSearchResult } from "@/bindings";
import { Button, Sheet, Spinner, TextInput } from "@/components/ui";
import styles from "./HardcoverSearchModal.module.css";

export interface HardcoverSearchModalProps {
	open: boolean;
	onOpenChange: (open: boolean) => void;
	query: string;
	onQueryChange: (query: string) => void;
	/** Called when the user presses Enter or clicks the Search button. */
	onSearch: () => void;
	isSearching: boolean;
	results: HardcoverSearchResult[];
	onSelect: (result: HardcoverSearchResult) => void;
	/** When set, rendered as an error notice above the results area. */
	error?: string | null;
	width?: number;
}

/**
 * The "Find on Hardcover" search sheet, shared by Edit Book and the
 * Add Book import flow. Purely presentational — the caller owns all state.
 */
export const HardcoverSearchModal = ({
	open,
	onOpenChange,
	query,
	onQueryChange,
	onSearch,
	isSearching,
	results,
	onSelect,
	error = null,
	width = 780,
}: HardcoverSearchModalProps) => (
	<Sheet
		open={open}
		onOpenChange={onOpenChange}
		title="Find on Hardcover"
		width={width}
	>
		<div className={styles.searchStack}>
			<div className={styles.inlineControls}>
				<TextInput
					placeholder="Search by title or author…"
					className={styles.flexGrow}
					value={query}
					onChange={(event) => onQueryChange(event.target.value)}
					onKeyDown={(event) => {
						if (event.key === "Enter") {
							event.preventDefault();
							onSearch();
						}
					}}
				/>
				<Button variant="primary" disabled={isSearching} onClick={onSearch}>
					Search
				</Button>
			</div>
			{error && (
				<p className={styles.errorNote} role="alert">
					{error}
				</p>
			)}
			<div className={styles.searchResults}>
				{results.length === 0 ? (
					<div className={styles.searchEmpty}>
						{isSearching ? (
							<Spinner />
						) : query ? (
							"No results found. Try a different search query."
						) : (
							"Enter a title or author name to search."
						)}
					</div>
				) : (
					results.map((result) => (
						<button
							type="button"
							key={result.hardcover_id}
							className={styles.searchResult}
							onClick={() => onSelect(result)}
						>
							{result.image_url && (
								<img
									src={result.image_url}
									alt={result.title}
									className={styles.searchResultCover}
								/>
							)}
							<div className={styles.searchResultMeta}>
								<span className={styles.searchResultTitle}>{result.title}</span>
								{result.authors && result.authors.length > 0 && (
									<span className={styles.searchResultDetail}>
										{result.authors.join(", ")}
									</span>
								)}
								{result.release_year && (
									<span className={styles.searchResultDetail}>
										Published {result.release_year}
									</span>
								)}
								{result.description && (
									<span
										className={`${styles.searchResultDetail} ${styles.searchResultClamp}`}
									>
										{result.description.replace(/<[^>]*>/g, "")}
									</span>
								)}
							</div>
						</button>
					))
				)}
			</div>
		</div>
	</Sheet>
);
