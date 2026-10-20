import { createFileRoute } from "@tanstack/react-router";
import { Publishers } from "@/components/pages/Publishers";

export const Route = createFileRoute("/publishers")({
	component: Publishers,
});
