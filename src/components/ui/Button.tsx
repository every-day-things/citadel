import clsx from "clsx";
import { forwardRef } from "react";
import styles from "./Button.module.css";

export type ButtonProps = React.ButtonHTMLAttributes<HTMLButtonElement> & {
	variant?: "default" | "primary" | "danger" | "subtle";
	size?: "sm" | "md";
	fullWidth?: boolean;
};

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
	(
		{
			variant = "default",
			size = "md",
			fullWidth = false,
			className,
			type = "button",
			...rest
		},
		ref,
	) => (
		<button
			ref={ref}
			type={type}
			className={clsx(
				styles.button,
				styles[variant],
				styles[size],
				fullWidth && styles.fullWidth,
				className,
			)}
			{...rest}
		/>
	),
);

Button.displayName = "Button";
