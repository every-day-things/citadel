import * as Dialog from "@radix-ui/react-dialog";
import type { ReactNode } from "react";
import styles from "./Sheet.module.css";

export interface SheetProps {
	open: boolean;
	onOpenChange: (open: boolean) => void;
	title: string;
	children: ReactNode;
	width?: number;
	/**
	 * Sheets are usually opened programmatically (no Dialog.Trigger), so Radix
	 * has no trigger to return focus to on close. Callers should preventDefault
	 * here and refocus the control that opened the sheet.
	 */
	onCloseAutoFocus?: (event: Event) => void;
}

/** A macOS document sheet that slides out from under the toolbar. */
export const Sheet = ({
	open,
	onOpenChange,
	title,
	children,
	width = 540,
	onCloseAutoFocus,
}: SheetProps) => (
	<Dialog.Root open={open} onOpenChange={onOpenChange}>
		<Dialog.Portal>
			<Dialog.Overlay className={styles.overlay} />
			{/* No Dialog.Description; aria-describedby={undefined} silences the Radix warning. */}
			<Dialog.Content
				className={styles.content}
				style={{ width: `min(${width}px, calc(100vw - 32px))` }}
				aria-describedby={undefined}
				onCloseAutoFocus={onCloseAutoFocus}
			>
				<div className={styles.header}>
					<Dialog.Title className={styles.title}>{title}</Dialog.Title>
					<Dialog.Close asChild>
						<button type="button" aria-label="Close" className={styles.close}>
							<svg
								width="9"
								height="9"
								viewBox="0 0 9 9"
								fill="none"
								aria-hidden="true"
							>
								<path
									d="M1.5 1.5l6 6M7.5 1.5l-6 6"
									stroke="currentColor"
									strokeWidth="1.4"
									strokeLinecap="round"
								/>
							</svg>
						</button>
					</Dialog.Close>
				</div>
				<div className={styles.body}>{children}</div>
			</Dialog.Content>
		</Dialog.Portal>
	</Dialog.Root>
);
