import clsx from "clsx";
import { forwardRef, useId } from "react";
import styles from "./TextInput.module.css";

export type TextInputProps = React.InputHTMLAttributes<HTMLInputElement> & {
	label?: string;
	/** Validation message rendered below the field. */
	error?: React.ReactNode;
};

export const TextInput = forwardRef<HTMLInputElement, TextInputProps>(
	(
		{
			label,
			error,
			className,
			id,
			"aria-describedby": ariaDescribedby,
			...rest
		},
		ref,
	) => {
		const fallbackId = useId();
		const inputId = id ?? fallbackId;
		const hasError = error !== undefined && error !== null && error !== false;
		const errorId = `${inputId}-error`;

		const input = (
			<input
				ref={ref}
				id={inputId}
				className={clsx(styles.input, hasError && styles.inputError, className)}
				aria-invalid={hasError || undefined}
				aria-describedby={
					clsx(ariaDescribedby, hasError && errorId) || undefined
				}
				{...rest}
			/>
		);

		if (!label && !hasError) {
			return input;
		}

		return (
			<div className={styles.field}>
				{label && (
					<label className={styles.label} htmlFor={inputId}>
						{label}
					</label>
				)}
				{input}
				{hasError && (
					<div id={errorId} className={styles.error}>
						{error}
					</div>
				)}
			</div>
		);
	},
);

TextInput.displayName = "TextInput";
