import type { SVGProps } from "react";

export function F7CircleRighthalfFill(props: SVGProps<SVGSVGElement>) {
	return (
		<svg
			xmlns="http://www.w3.org/2000/svg"
			width="1em"
			height="1em"
			viewBox="0 0 56 56"
			{...props}
		>
			<title>Circle with the right half filled</title>
			{/* biome-ignore lint/style/useSelfClosingElements: It's an SVG */}
			<path
				fill="currentColor"
				d="M28.012 51.273c12.726 0 23.273-10.546 23.273-23.273c0-12.703-10.57-23.273-23.297-23.273C15.262 4.727 4.715 15.297 4.715 28c0 12.727 10.57 23.273 23.297 23.273m0-3.96A19.255 19.255 0 0 1 8.699 28A19.23 19.23 0 0 1 27.99 8.71Z"
			></path>
		</svg>
	);
}
