import * as RadixCheckbox from "@radix-ui/react-checkbox";
import { forwardRef, useId } from "react";
import styles from "./Checkbox.module.css";

export interface CheckboxProps {
	checked: boolean;
	onCheckedChange: (checked: boolean) => void;
	label?: string;
	disabled?: boolean;
	id?: string;
}

export const Checkbox = forwardRef<HTMLButtonElement, CheckboxProps>(
	({ checked, onCheckedChange, label, disabled, id }, ref) => {
		const fallbackId = useId();
		const checkboxId = id ?? fallbackId;

		const control = (
			<RadixCheckbox.Root
				ref={ref}
				id={checkboxId}
				checked={checked}
				onCheckedChange={(value) => onCheckedChange(value === true)}
				disabled={disabled}
				className={styles.box}
			>
				<RadixCheckbox.Indicator className={styles.indicator}>
					<svg
						width="10"
						height="10"
						viewBox="0 0 10 10"
						fill="none"
						aria-hidden="true"
					>
						<path
							d="M1.8 5.2L4 7.4L8.2 2.6"
							stroke="oklch(100% 0 0)"
							strokeWidth="1.8"
							strokeLinecap="round"
							strokeLinejoin="round"
						/>
					</svg>
				</RadixCheckbox.Indicator>
			</RadixCheckbox.Root>
		);

		if (!label) {
			return control;
		}

		return (
			<span className={styles.row}>
				{control}
				<label
					className={styles.label}
					htmlFor={checkboxId}
					data-disabled={disabled || undefined}
				>
					{label}
				</label>
			</span>
		);
	},
);

Checkbox.displayName = "Checkbox";
