const isClientSide = typeof window !== "undefined";

/** Download a file from a URL.
 * Requires a browser environment.
 * @param url The URL to download from.
 */
export const downloadFile = (url: string) => {
	if (!isClientSide) {
		return;
	}

	const a = document.createElement("a");
	a.href = url;
	document.body.appendChild(a);
	a.click();
	document.body.removeChild(a);
};
