import { isTauri } from "@tauri-apps/api/core";

/** Host detection belongs to adapter selection, never to components. */
export const isDesktop = isTauri();
