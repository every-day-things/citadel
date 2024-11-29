import type { SVGProps } from "react";

export function F7Pencil(props: SVGProps<SVGSVGElement>) {
	return (
		<svg
			xmlns="http://www.w3.org/2000/svg"
			width="1em"
			height="1em"
			viewBox="0 0 56 56"
			{...props}
		>
			<title>Pencil</title>
			{/* biome-ignore lint/style/useSelfClosingElements: It's an SVG */}
			<path
				fill="currentColor"
				d="m43.293 16.926l2.367-2.32c1.196-1.196 1.242-2.485.188-3.563l-.797-.797c-1.055-1.055-2.344-.937-3.54.211l-2.367 2.344ZM15.66 44.488l25.57-25.547l-4.101-4.125l-25.594 25.57L9.31 45.59c-.211.562.375 1.219.937.984Z"
			></path>
		</svg>
	);
}
