import { useNavigate } from "@tanstack/react-router";
import { isTauri } from "@tauri-apps/api/core";
import { useCallback } from "react";
import { commands } from "@/bindings";

/**
 * Opens the Settings UI. Settings live in their own window on the desktop; the
 * Rust command owns the window options and focuses the existing window if one
 * is already open. On the web there is no second window, so we route to the
 * in-app /settings page instead.
 */
export const useOpenSettings = (): (() => void) => {
	const navigate = useNavigate();
	return useCallback(() => {
		if (isTauri()) {
			void commands.clbCmdOpenSettings();
		} else {
			void navigate({ to: "/settings" });
		}
	}, [navigate]);
};
