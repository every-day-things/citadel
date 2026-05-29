import { createContext, useContext } from "react";
import type { PlatformAdapter } from "./types";

export const PlatformContext = createContext<PlatformAdapter | null>(null);

export const PlatformProvider = PlatformContext.Provider;

export const usePlatform = (): PlatformAdapter => {
	const platform = useContext(PlatformContext);
	if (!platform) {
		throw new Error("usePlatform must be used within a PlatformProvider");
	}
	return platform;
};
