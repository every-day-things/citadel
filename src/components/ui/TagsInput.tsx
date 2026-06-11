import clsx from "clsx";
import { useEffect, useId, useMemo, useRef, useState } from "react";
import styles from "./TagsInput.module.css";

export interface TagsInputProps {
	value: string[];
	onChange: (next: string[]) => void;
	suggestions?: string[];
	placeholder?: string;
	label?: string;
	"aria-label"?: string;
	/** Validation message rendered below the field. */
	error?: React.ReactNode;
	disabled?: boolean;
	id?: string;
	className?: string;
}

/**
 * An NSTokenField: committed values render as capsule tokens inside the
 * field, typing filters a completion list below it, and Enter or comma
 * commits the highlighted completion (or free text). Follows the WAI-ARIA
 * combobox/listbox pattern.
 */
export const TagsInput = ({
	value,
	onChange,
	suggestions = [],
	placeholder,
	label,
	"aria-label": ariaLabel,
	error,
	disabled = false,
	id,
	className,
}: TagsInputProps) => {
	const fallbackId = useId();
	const inputId = id ?? fallbackId;
	const listboxId = `${inputId}-listbox`;
	const errorId = `${inputId}-error`;
	const hasError = error !== undefined && error !== null && error !== false;

	const inputRef = useRef<HTMLInputElement>(null);
	const highlightedRef = useRef<HTMLDivElement>(null);

	const [query, setQuery] = useState("");
	const [open, setOpen] = useState(false);
	const [highlight, setHighlight] = useState(0);

	const filtered = useMemo(() => {
		const taken = new Set(value.map((v) => v.toLowerCase()));
		const needle = query.trim().toLowerCase();
		return suggestions.filter(
			(s) =>
				!taken.has(s.toLowerCase()) &&
				(needle === "" || s.toLowerCase().includes(needle)),
		);
	}, [suggestions, value, query]);

	const listVisible = open && !disabled && filtered.length > 0;
	const highlightIndex = Math.min(highlight, filtered.length - 1);

	// Keep the highlighted option scrolled into view.
	useEffect(() => {
		if (listVisible) {
			highlightedRef.current?.scrollIntoView({ block: "nearest" });
		}
	}, [listVisible]);

	const addToken = (raw: string) => {
		const text = raw.trim();
		if (!text) return false;
		// Dedupe case-insensitively against committed tokens.
		if (value.some((v) => v.toLowerCase() === text.toLowerCase())) {
			setQuery("");
			setOpen(false);
			return true;
		}
		// Prefer the suggestion's canonical casing for free-typed matches.
		const canonical =
			suggestions.find((s) => s.toLowerCase() === text.toLowerCase()) ?? text;
		onChange([...value, canonical]);
		setQuery("");
		setOpen(false);
		setHighlight(0);
		return true;
	};

	const removeToken = (token: string) => {
		onChange(value.filter((v) => v !== token));
	};

	const commitCurrent = () => {
		const highlighted = listVisible ? filtered[highlightIndex] : undefined;
		return addToken(highlighted ?? query);
	};

	const handleKeyDown = (event: React.KeyboardEvent<HTMLInputElement>) => {
		switch (event.key) {
			case "Enter":
				if (listVisible || query.trim() !== "") {
					event.preventDefault();
					commitCurrent();
				}
				break;
			case ",":
				event.preventDefault();
				commitCurrent();
				break;
			case "ArrowDown":
				event.preventDefault();
				if (!listVisible) {
					setOpen(true);
					setHighlight(0);
				} else {
					setHighlight(Math.min(highlightIndex + 1, filtered.length - 1));
				}
				break;
			case "ArrowUp":
				if (listVisible) {
					event.preventDefault();
					setHighlight(Math.max(highlightIndex - 1, 0));
				}
				break;
			case "Escape":
				if (listVisible) {
					// Close only the completion list, not an enclosing dialog.
					event.preventDefault();
					event.stopPropagation();
					setOpen(false);
				}
				break;
			case "Backspace": {
				const last = value[value.length - 1];
				if (query === "" && last !== undefined) {
					event.preventDefault();
					removeToken(last);
				}
				break;
			}
			default:
				break;
		}
	};

	const control = (
		<div className={styles.control}>
			{/* biome-ignore lint/a11y/noStaticElementInteractions: click-anywhere-to-focus convenience; the inner input is the real interactive element. */}
			{/* biome-ignore lint/a11y/useKeyWithClickEvents: see above */}
			<div
				className={clsx(
					styles.field,
					hasError && styles.fieldError,
					disabled && styles.fieldDisabled,
				)}
				onClick={() => inputRef.current?.focus()}
			>
				{value.map((token) => (
					<span key={token} className={styles.token}>
						<span className={styles.tokenText}>{token}</span>
						{!disabled && (
							<button
								type="button"
								className={styles.tokenRemove}
								aria-label={`Remove ${token}`}
								// Keep focus in the input so blur does not commit
								// a half-typed entry before this click lands.
								onMouseDown={(event) => event.preventDefault()}
								onClick={() => removeToken(token)}
							>
								<svg
									width="7"
									height="7"
									viewBox="0 0 7 7"
									fill="none"
									aria-hidden="true"
								>
									<path
										d="M1 1l5 5M6 1L1 6"
										stroke="currentColor"
										strokeWidth="1.2"
										strokeLinecap="round"
									/>
								</svg>
							</button>
						)}
					</span>
				))}
				<input
					ref={inputRef}
					id={inputId}
					className={styles.input}
					type="text"
					role="combobox"
					aria-expanded={listVisible}
					aria-controls={listboxId}
					aria-autocomplete="list"
					aria-activedescendant={
						listVisible && highlightIndex >= 0
							? `${listboxId}-opt-${highlightIndex}`
							: undefined
					}
					aria-label={label ? undefined : ariaLabel}
					aria-invalid={hasError || undefined}
					aria-describedby={hasError ? errorId : undefined}
					placeholder={value.length === 0 ? placeholder : undefined}
					disabled={disabled}
					value={query}
					onChange={(event) => {
						setQuery(event.target.value);
						setOpen(true);
						setHighlight(0);
					}}
					onKeyDown={handleKeyDown}
					onBlur={() => {
						// Commit pending free text so a type-then-click-Save flow
						// does not silently drop the last entry.
						addToken(query);
						setOpen(false);
					}}
					autoComplete="off"
					autoCorrect="off"
					spellCheck={false}
				/>
			</div>
			{/* ARIA combobox pattern: focus stays on the input and aria-activedescendant tracks the option, so the listbox itself is not focusable. */}
			<div
				id={listboxId}
				role="listbox"
				aria-label={label ?? ariaLabel ?? "Suggestions"}
				className={styles.listbox}
				hidden={!listVisible}
			>
				{listVisible &&
					filtered.map((suggestion, index) => (
						// biome-ignore lint/a11y/useFocusableInteractive: see listbox note above.
						// biome-ignore lint/a11y/useKeyWithClickEvents: keyboard selection happens on the combobox input.
						<div
							key={suggestion}
							id={`${listboxId}-opt-${index}`}
							role="option"
							aria-selected={index === highlightIndex}
							ref={index === highlightIndex ? highlightedRef : undefined}
							className={clsx(
								styles.option,
								index === highlightIndex && styles.optionHighlighted,
							)}
							// preventDefault keeps focus on the input through the click.
							onMouseDown={(event) => event.preventDefault()}
							onClick={() => addToken(suggestion)}
							onMouseMove={() => setHighlight(index)}
						>
							{suggestion}
						</div>
					))}
			</div>
		</div>
	);

	if (!label && !hasError) {
		return className ? <div className={className}>{control}</div> : control;
	}

	return (
		<div className={clsx(styles.wrapper, className)}>
			{label && (
				<label className={styles.label} htmlFor={inputId}>
					{label}
				</label>
			)}
			{control}
			{hasError && (
				<div id={errorId} className={styles.error}>
					{error}
				</div>
			)}
		</div>
	);
};
