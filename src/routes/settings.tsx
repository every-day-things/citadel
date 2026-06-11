import { SettingsWindow } from "@/components/pages/SettingsWindow";
import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/settings")({
	component: SettingsWindow,
});
