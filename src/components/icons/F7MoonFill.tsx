import type { SVGProps } from "react";

export function F7MoonFill(props: SVGProps<SVGSVGElement>) {
	return (
		<svg
			xmlns="http://www.w3.org/2000/svg"
			width="1em"
			height="1em"
			viewBox="0 0 56 56"
			{...props}
		>
			<title>Crescent moon</title>
			{/* biome-ignore lint/style/useSelfClosingElements: It's an SVG */}
			<path
				fill="currentColor"
				d="M41.149 36.156c-12.68 0-20.79-7.945-20.79-20.648c0-2.625.633-6.375 1.454-8.32c.234-.54.257-.868.257-1.102c0-.633-.468-1.336-1.359-1.336c-.281 0-.82.07-1.336.258C10.703 8.477 4.891 17.805 4.891 27.625c0 13.781 10.5 23.625 24.234 23.625c10.078 0 18.844-6.117 21.75-13.758a4.483 4.483 0 0 0 .234-1.312c0-.867-.703-1.453-1.36-1.453c-.304 0-.562.07-1.007.21c-1.804.586-4.71 1.22-7.593 1.22"
			></path>
		</svg>
	);
}
