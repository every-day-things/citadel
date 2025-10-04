import type { SVGProps } from "react";

export function FluentLibraryFilled(props: SVGProps<SVGSVGElement>) {
	return (
		<svg
			xmlns="http://www.w3.org/2000/svg"
			width={"1em"}
			height={"1em"}
			viewBox="0 0 32 32"
			{...props}
		>
			<title>Library</title>
			{/* biome-ignore lint/style/useSelfClosingElements: It's an SVG */}
			<path
				fill="currentColor"
				d="M3 5.5A2.5 2.5 0 0 1 5.5 3h2A2.5 2.5 0 0 1 10 5.5v21A2.5 2.5 0 0 1 7.5 29h-2A2.5 2.5 0 0 1 3 26.5zm9 0A2.5 2.5 0 0 1 14.5 3h2A2.5 2.5 0 0 1 19 5.5v21a2.5 2.5 0 0 1-2.5 2.5h-2a2.5 2.5 0 0 1-2.5-2.5zm9.8 2.105c-1.295.358-2.064 1.733-1.717 3.07l4.27 16.466c.348 1.338 1.678 2.131 2.973 1.773l1.875-.52c1.294-.357 2.063-1.732 1.716-3.07L26.647 8.86c-.348-1.338-1.678-2.131-2.973-1.773z"
			></path>
		</svg>
	);
}
