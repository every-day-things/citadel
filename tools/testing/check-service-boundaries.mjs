import { readFileSync, readdirSync } from "node:fs";
import { checkServiceBoundaries } from "./service-boundaries.ts";

function files(directory) {
	return readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
		const file = `${directory}/${entry.name}`;
		return entry.isDirectory()
			? files(file)
			: /\.[jt]sx?$/.test(file)
				? [file]
				: [];
	});
}
const errors = files("src").flatMap((file) =>
	checkServiceBoundaries(file, readFileSync(file, "utf8")),
);
if (errors.length) {
	process.stderr.write(`${errors.join("\n")}\n`);
	process.exitCode = 1;
} else process.stdout.write("Service boundaries checked.\n");
