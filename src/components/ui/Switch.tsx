import * as RadixSwitch from "@radix-ui/react-switch";
import { forwardRef, useId } from "react";
import styles from "./Switch.module.css";

export interface SwitchProps {
	checked: boolean;
	onCheckedChange: (checked: boolean) => void;
	label?: string;
	disabled?: boolean;
	id?: string;
}

export const Switch = forwardRef<HTMLButtonElement, SwitchProps>(
	({ checked, onCheckedChange, label, disabled, id }, ref) => {
		const fallbackId = useId();
		const switchId = id ?? fallbackId;

		const control = (
			<RadixSwitch.Root
				ref={ref}
				id={switchId}
				checked={checked}
				onCheckedChange={onCheckedChange}
				disabled={disabled}
				className={styles.track}
			>
				<RadixSwitch.Thumb className={styles.thumb} />
			</RadixSwitch.Root>
		);

		if (!label) {
			return control;
		}

		return (
			<span className={styles.row}>
				{control}
				<label
					className={styles.label}
					htmlFor={switchId}
					data-disabled={disabled || undefined}
				>
					{label}
				</label>
			</span>
		);
	},
);

Switch.displayName = "Switch";
