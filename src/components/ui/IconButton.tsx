import clsx from "clsx";
import { forwardRef } from "react";
import styles from "./IconButton.module.css";

export type IconButtonProps = React.ButtonHTMLAttributes<HTMLButtonElement> & {
	"aria-label": string;
	active?: boolean;
};

export const IconButton = forwardRef<HTMLButtonElement, IconButtonProps>(
	({ active = false, className, type = "button", ...rest }, ref) => (
		<button
			ref={ref}
			type={type}
			data-active={active || undefined}
			className={clsx(styles.iconButton, className)}
			{...rest}
		/>
	),
);

IconButton.displayName = "IconButton";
