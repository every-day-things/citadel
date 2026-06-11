import clsx from "clsx";
import { forwardRef } from "react";
import styles from "./DialogCloseButton.module.css";

export type DialogCloseButtonProps =
	React.ButtonHTMLAttributes<HTMLButtonElement>;

/**
 * The small circular close button shared by Sheet and Drawer headers.
 * Designed to sit inside a Radix `Dialog.Close asChild`, so it forwards
 * its ref and spreads whatever props Radix injects.
 */
export const DialogCloseButton = forwardRef<
	HTMLButtonElement,
	DialogCloseButtonProps
>(({ className, "aria-label": ariaLabel = "Close", ...rest }, ref) => (
	<button
		ref={ref}
		type="button"
		aria-label={ariaLabel}
		className={clsx(styles.close, className)}
		{...rest}
	>
		<svg width="9" height="9" viewBox="0 0 9 9" fill="none" aria-hidden="true">
			<path
				d="M1.5 1.5l6 6M7.5 1.5l-6 6"
				stroke="currentColor"
				strokeWidth="1.4"
				strokeLinecap="round"
			/>
		</svg>
	</button>
));

DialogCloseButton.displayName = "DialogCloseButton";
