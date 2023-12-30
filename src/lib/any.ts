export const any = <T>(
  iteratable: Iterable<T>,
  predicate: (item: T) => boolean
) => {
  for (const x of iteratable) {
    if (predicate(x)) {
      return true;
    }
  }
  return false;
};
