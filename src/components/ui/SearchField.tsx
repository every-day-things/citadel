import clsx from "clsx";
import { forwardRef } from "react";
import styles from "./SearchField.module.css";

export type SearchFieldProps = React.InputHTMLAttributes<HTMLInputElement>;

export const SearchField = forwardRef<HTMLInputElement, SearchFieldProps>(
	({ className, ...rest }, ref) => (
		<span className={styles.wrapper}>
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
			<input
				ref={ref}
				type="search"
				className={clsx(styles.input, className)}
				{...rest}
			/>
		</span>
	),
);

SearchField.displayName = "SearchField";
