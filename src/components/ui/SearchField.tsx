import clsx from "clsx";
import { forwardRef } from "react";
import styles from "./SearchField.module.css";

/**
 * A scoped-filter token rendered inside the field, macOS token-field style
 * (Finder/Mail). Tokens sit between the magnifier and the text input, so
 * future filter kinds (tags, …) stack in the same place.
 */
export interface SearchFieldToken {
	label: string;
	onRemove: () => void;
	/** Optional hover explanation for the token. */
	title?: string;
}

export type SearchFieldProps = React.InputHTMLAttributes<HTMLInputElement> & {
	tokens?: SearchFieldToken[];
};

export const SearchField = forwardRef<HTMLInputElement, SearchFieldProps>(
	({ className, tokens, onKeyDown, ...rest }, ref) => (
		<span className={clsx(styles.wrapper, className)}>
			<svg
				className={styles.magnifier}
				width="12"
				height="12"
				viewBox="0 0 15 15"
				fill="none"
				aria-hidden="true"
			>
				<circle
					cx="6.5"
					cy="6.5"
					r="4.5"
					stroke="currentColor"
					strokeWidth="1.4"
				/>
				<path
					d="M10 10l3.5 3.5"
					stroke="currentColor"
					strokeWidth="1.4"
					strokeLinecap="round"
				/>
			</svg>
			{tokens?.map((token) => (
				<span key={token.label} className={styles.token} title={token.title}>
					{token.label}
					<button
						type="button"
						aria-label={`Remove filter ${token.label}`}
						className={styles.tokenRemove}
						onClick={token.onRemove}
					>
						<svg
							width="7"
							height="7"
							viewBox="0 0 9 9"
							fill="none"
							aria-hidden="true"
						>
							<path
								d="M1.5 1.5l6 6M7.5 1.5l-6 6"
								stroke="currentColor"
								strokeWidth="1.6"
								strokeLinecap="round"
							/>
						</svg>
					</button>
				</span>
			))}
			<input
				ref={ref}
				type="search"
				className={styles.input}
				onKeyDown={(event) => {
					// Backspace in an empty input removes the last token, like
					// a native NSTokenField.
					if (event.key === "Backspace" && event.currentTarget.value === "") {
						tokens?.at(-1)?.onRemove();
					}
					onKeyDown?.(event);
				}}
				{...rest}
			/>
		</span>
	),
);

SearchField.displayName = "SearchField";
