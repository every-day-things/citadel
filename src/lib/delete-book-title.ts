export const deleteBookDialogTitle = (title: string): string => {
	const characters = Array.from(title);
	const displayTitle =
		characters.length > 60 ? `${characters.slice(0, 59).join("")}…` : title;
	return `Delete “${displayTitle}”?`;
};
