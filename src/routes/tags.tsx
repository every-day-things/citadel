import { createFileRoute } from "@tanstack/react-router";
import { Tags } from "@/components/pages/Tags";

export const Route = createFileRoute("/tags")({
	component: Tags,
});
