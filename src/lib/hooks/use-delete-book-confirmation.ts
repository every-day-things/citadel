import { useState } from "react";

export const useDeleteBookConfirmation = (onDelete: () => Promise<void>) => {
	const [open, setOpen] = useState(false);
	const [pending, setPending] = useState(false);
	const [error, setError] = useState<string | null>(null);
	const confirm = async () => {
		if (pending) return;
		setOpen(false);
		setPending(true);
		setError(null);
		try {
			await onDelete();
		} catch (error) {
			setError(error instanceof Error ? error.message : String(error));
		} finally {
			setPending(false);
		}
	};
	return { open, setOpen, pending, error, confirm };
};
