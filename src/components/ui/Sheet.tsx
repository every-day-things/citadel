import * as Dialog from "@radix-ui/react-dialog";
import type { ReactNode } from "react";
import { DialogCloseButton } from "./DialogCloseButton";
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

/** A macOS document sheet: detached below the toolbar, dimming the window. */
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
						<DialogCloseButton />
					</Dialog.Close>
				</div>
				<div className={styles.body}>{children}</div>
			</Dialog.Content>
		</Dialog.Portal>
	</Dialog.Root>
);
