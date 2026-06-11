import { createFileRoute } from "@tanstack/react-router";
import { SettingsWindow } from "@/components/pages/SettingsWindow";

export const Route = createFileRoute("/settings")({
	component: SettingsWindow,
});
