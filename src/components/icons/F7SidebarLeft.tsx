import type { SVGProps } from "react";

type F7SidebarLeftProps = {
	title?: string;
} & SVGProps<SVGSVGElement>;

export function F7SidebarLeft(props: F7SidebarLeftProps) {
	return (
		<svg
			xmlns="http://www.w3.org/2000/svg"
			width="1em"
			height="1em"
			viewBox="0 0 56 56"
			{...props}
		>
			<title>{props.title ?? ""}</title>
			{/* biome-ignore lint/style/useSelfClosingElements: It's an SVG */}
			<path
				fill="currentColor"
				d="M7.715 49.574h40.57c4.899 0 7.36-2.437 7.36-7.265V13.69c0-4.828-2.461-7.265-7.36-7.265H7.715C2.84 6.426.355 8.84.355 13.69v28.62c0 4.851 2.485 7.265 7.36 7.265m.07-3.773c-2.344 0-3.656-1.242-3.656-3.68V13.88c0-2.438 1.312-3.68 3.656-3.68h10.43v35.602ZM48.215 10.2c2.32 0 3.656 1.242 3.656 3.68v28.24c0 2.438-1.336 3.68-3.656 3.68h-26.32V10.199Zm-34.5 8.696c.703 0 1.336-.633 1.336-1.313c0-.703-.633-1.312-1.336-1.312h-5.04c-.702 0-1.312.609-1.312 1.312c0 .68.61 1.313 1.313 1.313Zm0 6.07c.703 0 1.336-.633 1.336-1.336c0-.703-.633-1.29-1.336-1.29h-5.04c-.702 0-1.312.587-1.312 1.29c0 .703.61 1.336 1.313 1.336Zm0 6.047c.703 0 1.336-.586 1.336-1.29c0-.702-.633-1.312-1.336-1.312h-5.04c-.702 0-1.312.61-1.312 1.313s.61 1.289 1.313 1.289Z"
			></path>
		</svg>
	);
}
