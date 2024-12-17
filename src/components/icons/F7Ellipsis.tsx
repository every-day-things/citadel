import type { SVGProps } from "react";

export function F7Ellipsis(props: SVGProps<SVGSVGElement>) {
	return (
		<svg
			xmlns="http://www.w3.org/2000/svg"
			width="1em"
			height="1em"
			viewBox="0 0 56 56"
			{...props}
		>
			<title>Ellipsis</title>
			{/* biome-ignore lint/style/useSelfClosingElements: It's an SVG */}
			<path
				fill="currentColor"
				d="M15.32 28c0-2.602-2.086-4.687-4.734-4.687A4.67 4.67 0 0 0 5.899 28a4.67 4.67 0 0 0 4.687 4.688c2.648 0 4.734-2.086 4.734-4.688m17.344 0c0-2.602-2.062-4.687-4.664-4.687S23.336 25.398 23.336 28s2.062 4.688 4.664 4.688s4.664-2.086 4.664-4.688m17.438 0a4.686 4.686 0 0 0-4.688-4.687c-2.648 0-4.734 2.085-4.734 4.687s2.086 4.688 4.734 4.688A4.686 4.686 0 0 0 50.102 28"
			></path>
		</svg>
	);
}
