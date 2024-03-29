import { useMantineTheme } from "@mantine/core";
import { useMediaQuery } from "@mantine/hooks";

export function useBreakpoint(minBreakpoint = 'sm', exact = false) {
  const theme = useMantineTheme();

  // biome-ignore lint/suspicious/noImplicitAnyLet: <explanation>
let  query;
  if (exact) {
    // Exact breakpoint: min-width of this breakpoint and max-width of the next one (if it exists)
    const nextBreakpointIndex = Object.keys(theme.breakpoints).indexOf(minBreakpoint) + 1;
    const nextBreakpointKey = Object.keys(theme.breakpoints)[nextBreakpointIndex];
    const maxQuery = nextBreakpointKey ? ` and (max-width: calc(${theme.breakpoints[nextBreakpointKey]} - 1px)` : '';
    query = `(min-width: ${theme.breakpoints[minBreakpoint]}) ${maxQuery}`;
  } else {
    // Min-width query for "minBreakpoint or larger"
    query = `(min-width: ${theme.breakpoints[minBreakpoint]})`;
  }

  return useMediaQuery(query);
}
