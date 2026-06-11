import { useCallback, useEffect, useId, useRef, useState } from "react";
import { IconButton } from "@/components/ui";
import styles from "./RichTextEditor.module.css";

/**
 * Formatting commands surfaced in the toolbar. All of these are inline or
 * list toggles that document.execCommand handles natively, so no document
 * schema or selection model is needed.
 *
 * document.execCommand is deprecated, but it remains fully supported in the
 * WKWebView this desktop app ships in, and is the cheapest way to get basic
 * HTML editing without a full editor framework.
 */
const COMMANDS = [
	{ command: "bold", label: "Bold" },
	{ command: "italic", label: "Italic" },
	{ command: "underline", label: "Underline" },
	{ command: "insertUnorderedList", label: "Bullet list" },
	{ command: "insertOrderedList", label: "Numbered list" },
] as const;

type CommandId = (typeof COMMANDS)[number]["command"];

const INLINE_COMMANDS: CommandId[] = ["bold", "italic", "underline"];

const COMMAND_ICONS: Record<CommandId, React.ReactNode> = {
	bold: <span className={`${styles.glyph} ${styles.glyphBold}`}>B</span>,
	italic: <span className={`${styles.glyph} ${styles.glyphItalic}`}>I</span>,
	underline: (
		<span className={`${styles.glyph} ${styles.glyphUnderline}`}>U</span>
	),
	insertUnorderedList: (
		<svg
			width="14"
			height="14"
			viewBox="0 0 14 14"
			fill="none"
			aria-hidden="true"
		>
			<circle cx="2" cy="3" r="1.1" fill="currentColor" />
			<circle cx="2" cy="7" r="1.1" fill="currentColor" />
			<circle cx="2" cy="11" r="1.1" fill="currentColor" />
			<path
				d="M5.5 3h7M5.5 7h7M5.5 11h7"
				stroke="currentColor"
				strokeWidth="1.4"
				strokeLinecap="round"
			/>
		</svg>
	),
	insertOrderedList: (
		<svg
			width="14"
			height="14"
			viewBox="0 0 14 14"
			fill="none"
			aria-hidden="true"
		>
			<text
				x="0.2"
				y="4.6"
				fontSize="4.6"
				fill="currentColor"
				fontFamily="inherit"
			>
				1
			</text>
			<text
				x="0.2"
				y="8.8"
				fontSize="4.6"
				fill="currentColor"
				fontFamily="inherit"
			>
				2
			</text>
			<text
				x="0.2"
				y="13"
				fontSize="4.6"
				fill="currentColor"
				fontFamily="inherit"
			>
				3
			</text>
			<path
				d="M5.5 3h7M5.5 7h7M5.5 11h7"
				stroke="currentColor"
				strokeWidth="1.4"
				strokeLinecap="round"
			/>
		</svg>
	),
};

const EMPTY_STATES: Record<CommandId, boolean> = {
	bold: false,
	italic: false,
	underline: false,
	insertUnorderedList: false,
	insertOrderedList: false,
};

export interface RichTextEditorProps {
	/** The document as an HTML string (Calibre stores descriptions as HTML). */
	value: string;
	onChange: (html: string) => void;
	label?: string;
	"aria-label"?: string;
	/** Focus the editable area on mount (e.g. when toggling into edit mode). */
	autoFocus?: boolean;
}

/**
 * A minimal contenteditable rich-text editor with a Bold / Italic /
 * Underline / list toolbar, styled to match the kit Textarea chrome.
 */
export const RichTextEditor = ({
	value,
	onChange,
	label,
	"aria-label": ariaLabel,
	autoFocus = false,
}: RichTextEditorProps) => {
	const id = useId();
	const labelId = label ? `${id}-label` : undefined;
	const contentRef = useRef<HTMLDivElement>(null);
	// The last HTML we emitted via onChange; lets us tell our own updates
	// (skip, the DOM is already current) apart from external value changes.
	const lastEmittedRef = useRef<string | null>(null);
	const [activeStates, setActiveStates] = useState(EMPTY_STATES);

	// Sync the DOM from `value` only when the change came from outside
	// (initial mount, book reload, Hardcover populate), never re-writing the
	// HTML the user is currently typing.
	useEffect(() => {
		const node = contentRef.current;
		if (!node || value === lastEmittedRef.current) return;
		if (node.innerHTML !== value) {
			node.innerHTML = value;
		}
		lastEmittedRef.current = value;
	}, [value]);

	// biome-ignore lint/correctness/useExhaustiveDependencies: focus only once, on mount.
	useEffect(() => {
		if (autoFocus) {
			contentRef.current?.focus();
		}
	}, []);

	const refreshActiveStates = useCallback(() => {
		const next = { ...EMPTY_STATES };
		for (const { command } of COMMANDS) {
			try {
				next[command] = document.queryCommandState(command);
			} catch {
				next[command] = false;
			}
		}
		setActiveStates(next);
	}, []);

	// Track the caret so toolbar buttons reflect the formatting under it.
	useEffect(() => {
		const onSelectionChange = () => {
			const node = contentRef.current;
			const selection = document.getSelection();
			if (!node || !selection?.anchorNode) return;
			if (!node.contains(selection.anchorNode)) return;
			refreshActiveStates();
		};
		document.addEventListener("selectionchange", onSelectionChange);
		return () =>
			document.removeEventListener("selectionchange", onSelectionChange);
	}, [refreshActiveStates]);

	const emitChange = useCallback(() => {
		const html = contentRef.current?.innerHTML ?? "";
		lastEmittedRef.current = html;
		onChange(html);
		refreshActiveStates();
	}, [onChange, refreshActiveStates]);

	const exec = (command: CommandId) => {
		contentRef.current?.focus();
		// Deprecated but supported in this desktop webview; see note above.
		document.execCommand(command);
		emitChange();
	};

	const renderGroup = (commands: readonly CommandId[]) => (
		<div className={styles.group}>
			{COMMANDS.filter(({ command }) => commands.includes(command)).map(
				({ command, label: commandLabel }) => (
					<IconButton
						key={command}
						aria-label={commandLabel}
						aria-pressed={activeStates[command]}
						active={activeStates[command]}
						className={styles.toolButton}
						// Keep the selection in the editor; a regular click would
						// move focus to the button and collapse it.
						onMouseDown={(event) => event.preventDefault()}
						onClick={() => exec(command)}
					>
						{COMMAND_ICONS[command]}
					</IconButton>
				),
			)}
		</div>
	);

	return (
		<div className={styles.root}>
			{label && (
				<span id={labelId} className={styles.label}>
					{label}
				</span>
			)}
			<div className={styles.frame}>
				<div
					className={styles.toolbar}
					role="toolbar"
					aria-label="Text formatting"
				>
					{renderGroup(INLINE_COMMANDS)}
					{renderGroup(["insertUnorderedList", "insertOrderedList"])}
				</div>
				{/* biome-ignore lint/a11y/useSemanticElements: input/textarea cannot host rich HTML; contenteditable with role textbox is the standard pattern. */}
				<div
					ref={contentRef}
					className={styles.content}
					contentEditable
					// Focusable via contenteditable; explicit tabIndex keeps it in
					// the tab order even before the first paint of editable content.
					tabIndex={0}
					role="textbox"
					aria-multiline="true"
					aria-label={label ? undefined : ariaLabel}
					aria-labelledby={labelId}
					onInput={emitChange}
					onFocus={refreshActiveStates}
				/>
			</div>
		</div>
	);
};
