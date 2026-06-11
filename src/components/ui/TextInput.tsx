import clsx from "clsx";
import { forwardRef, useId } from "react";
import styles from "./TextInput.module.css";

export type TextInputProps = React.InputHTMLAttributes<HTMLInputElement> & {
	label?: string;
};

export const TextInput = forwardRef<HTMLInputElement, TextInputProps>(
	({ label, className, id, ...rest }, ref) => {
		const fallbackId = useId();
		const inputId = id ?? fallbackId;

		const input = (
			<input
				ref={ref}
				id={inputId}
				className={clsx(styles.input, className)}
				{...rest}
			/>
		);

		if (!label) {
			return input;
		}

		return (
			<div className={styles.field}>
				<label className={styles.label} htmlFor={inputId}>
					{label}
				</label>
				{input}
			</div>
		);
	},
);

TextInput.displayName = "TextInput";
