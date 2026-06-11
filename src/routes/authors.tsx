import { createFileRoute } from "@tanstack/react-router";
import { Authors } from "@/components/pages/Authors";

export const Route = createFileRoute("/authors")({
	component: Authors,
});
