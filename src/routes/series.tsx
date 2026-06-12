import { createFileRoute } from "@tanstack/react-router";
import { Series } from "@/components/pages/Series";

export const Route = createFileRoute("/series")({
	component: Series,
});
