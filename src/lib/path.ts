import { path } from "@tauri-apps/api";

/**
 * Join parts of a path together synchronously.
 *
 * Does not normalize the path, does not assume the first part is absolute.
 *
 * If possible, prefer async `@tauri-apps/api.path.join` instead.
 *
 * @param paths Path parts to join
 * @returns One string joining all parts, using platform-specific delimeter.
 *
 * @example
 * ```typescript
 * const path = joinSync('foo', 'bar', 'baz');
 * // linux/macos: foo/bar/baz
 * ```
 */
export const joinSync = (...paths: string[]): string => {
	return paths.join(path.sep);
};
