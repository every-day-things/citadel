import clsx from "clsx";
import styles from "./Spinner.module.css";

export interface SpinnerProps {
	/** Diameter in px. Defaults to 16. */
	size?: number;
	className?: string;
	"aria-label"?: string;
}

/* Eight spokes fading clockwise, like NSProgressIndicator's spinning style. */
const SPOKES = Array.from({ length: 8 }, (_, i) => ({
	angle: i * 45,
	opacity: 1 - i * 0.105,
}));

/** Small indeterminate progress spinner in the AppKit spoke style. */
export const Spinner = ({
	size = 16,
	className,
	"aria-label": ariaLabel = "Loading",
}: SpinnerProps) => (
	<span
		className={clsx(styles.spinner, className)}
		style={{ width: size, height: size }}
		role="progressbar"
		aria-label={ariaLabel}
	>
		<svg viewBox="0 0 16 16" fill="none" aria-hidden="true">
			{SPOKES.map((spoke) => (
				<rect
					key={spoke.angle}
					x="7.25"
					y="1"
					width="1.5"
					height="4"
					rx="0.75"
					fill="currentColor"
					opacity={spoke.opacity}
					transform={`rotate(${spoke.angle} 8 8)`}
				/>
			))}
		</svg>
	</span>
);
