/**
 * The AppKit pop-up button affordance: stacked up/down chevrons in a small
 * accent-filled rounded square, pinned to the control's right edge. Wired as
 * the global Select rightSection in src/lib/theme.ts.
 */
export const MacPopUpChevrons = () => (
	<span
		aria-hidden="true"
		style={{
			width: 16,
			height: 16,
			borderRadius: 4,
			background: "var(--ctd-accent)",
			display: "inline-flex",
			alignItems: "center",
			justifyContent: "center",
			flexShrink: 0,
		}}
	>
		<svg
			width="8"
			height="10"
			viewBox="0 0 8 10"
			fill="none"
			aria-hidden="true"
		>
			<path
				d="M1 3.5L4 1l3 2.5M1 6.5L4 9l3-2.5"
				stroke="oklch(99% 0.002 255)"
				strokeWidth="1.3"
				strokeLinecap="round"
				strokeLinejoin="round"
			/>
		</svg>
	</span>
);
