export const isDefined = <T>(value: T | undefined): value is T =>
	value !== undefined;

export const isNonNull = <T>(value: T | null): value is T => value !== null;

export const isSomething = <T>(value: T | undefined | null): value is T =>
	value !== undefined && value !== null;
