export const some = <T>(value: T): Option<T> => ({
	isSome: true,
	value,
});

export const none = <T>(): Option<T> => ({
	isSome: false,
	value: null,
});

export type Option<T> = {
	isSome: true;
	value: T;
} | {
	isSome: false;
	value: null;
};

export const unwrap = <T>(option: Option<T>): T => {
	if (option.isSome) {
		return option.value;
	}
	throw new Error("Called `unwrap` on a `None` value");
};
