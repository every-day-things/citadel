import clsx from "clsx";
import styles from "./LoadingOverlay.module.css";
import { Spinner } from "./Spinner";

export interface LoadingOverlayProps {
	visible: boolean;
	/** Spinner diameter in px. Defaults to 24. */
	spinnerSize?: number;
	className?: string;
}

/**
 * Covers the nearest `position: relative` ancestor with a translucent
 * backdrop and a centered spinner while content loads.
 */
export const LoadingOverlay = ({
	visible,
	spinnerSize = 24,
	className,
}: LoadingOverlayProps) => {
	if (!visible) return null;

	return (
		<div className={clsx(styles.overlay, className)}>
			<Spinner size={spinnerSize} />
		</div>
	);
};
