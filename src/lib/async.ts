const errorHandler = (e: Error) => {
	console.error(e);
	alert(e.message);
};

export const safeAsyncEventHandler = (
	f: (...args: unknown[]) => Promise<unknown>,
): (() => void) => {
	return () => {
		try {
			f().catch(errorHandler);
		} catch (e) {
			if (e instanceof Error) {
				errorHandler(e);
			}
		}
	};
};
