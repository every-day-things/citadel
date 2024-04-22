export const shortenToChars = (str: string, maxChars: number) =>
	str.length > maxChars ? `${str.substring(0, maxChars)}...` : str;
