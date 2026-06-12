import { Link } from "@tanstack/react-router";
import clsx from "clsx";
import { type CSSProperties, useMemo, useState } from "react";

import { SearchField } from "@/components/ui";
import { deriveSeriesSummaries, type SeriesSummary } from "@/lib/series";
import { useBooks, useBooksLoading } from "@/stores/library/store";
import styles from "./Series.module.css";

/**
 * Shared column template so the header row and every series row align:
 * name (flexible) | count (fixed).
 */
const SERIES_GRID: CSSProperties = {
	display: "grid",
	gridTemplateColumns: "minmax(160px, 1fr) 72px",
	alignItems: "center",
	columnGap: 16,
};

export const Series = () => {
	const books = useBooks();
	const loadingBooks = useBooksLoading();

	const [searchTerm, setSearchTerm] = useState("");

	const seriesSummaries = useMemo(() => deriveSeriesSummaries(books), [books]);

	const filteredSeries = useMemo(() => {
		const lowerSearch = searchTerm.toLowerCase();
		return seriesSummaries.filter(({ name }) =>
			name.toLowerCase().includes(lowerSearch),
		);
	}, [seriesSummaries, searchTerm]);

	if (loadingBooks) {
		return null;
	}

	return (
		<div className={styles.page}>
			<div className={styles.filterBar}>
				<SearchField
					placeholder="Search series"
					aria-label="Search series"
					value={searchTerm}
					onChange={(event) => setSearchTerm(event.currentTarget.value)}
					className={styles.searchInput}
				/>
			</div>

			<div className={styles.headerRow} style={SERIES_GRID}>
				<span className={styles.columnLabel}>Name</span>
				<span className={clsx(styles.columnLabel, styles.columnLabelRight)}>
					Books
				</span>
			</div>

			<div className={styles.rows}>
				{filteredSeries.map((series) => (
					<SeriesRow series={series} key={series.name} />
				))}
			</div>

			<div className={styles.footer}>
				<span className={styles.footerText}>
					{filteredSeries.length === seriesSummaries.length
						? `${seriesSummaries.length} series`
						: `${filteredSeries.length} of ${seriesSummaries.length} series`}
				</span>
			</div>
		</div>
	);
};

const SeriesRow = ({ series }: { series: SeriesSummary }) => {
	return (
		// The whole row links to the library filtered by this series. The hover
		// background, 40px min-height, and the overlay-link positioning live in
		// styles.css (.ctd-author-row / .ctd-author-row-link).
		<div className={clsx("ctd-author-row", styles.row)} style={SERIES_GRID}>
			{/* Real anchor overlaying the row so middle-click / cmd-click /
			    keyboard all work. The count link sits above it (position:
			    relative + zIndex), so it keeps working without stopPropagation. */}
			<Link
				to="/"
				search={{ search_for_series: series.name }}
				className="ctd-author-row-link"
				aria-label={`Show books in ${series.name}`}
			/>

			<span className={styles.cellText}>{series.name}</span>

			<Link
				to="/"
				search={{ search_for_series: series.name }}
				className={styles.countLink}
			>
				{series.bookCount}
			</Link>
		</div>
	);
};
