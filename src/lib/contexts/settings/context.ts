import { settings } from "@/stores/settings";
import { createContext } from "react";

export const settingsContext = createContext<typeof settings>(null as unknown as typeof settings);
