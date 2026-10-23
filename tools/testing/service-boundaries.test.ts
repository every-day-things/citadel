import { describe, expect, it } from "vitest";
import bindingsSource from "../../src/bindings.ts?raw";
import {
	checkServiceBoundaries,
	commandsByAdapter,
} from "./service-boundaries";

describe("service import boundaries", () => {
	it("assigns every registered command to exactly one boundary", () => {
		const registered = [...bindingsSource.matchAll(/^async (\w+)\(/gm)]
			.map((match) => match[1])
			.sort();
		const owned = Object.values(commandsByAdapter).flat().sort();
		expect(owned).toEqual(registered);
		expect(new Set(owned).size).toBe(owned.length);
	});
	it("permits generated contract types but rejects mixed runtime imports and re-exports", () => {
		const file = "src/components/Book.tsx";
		expect(
			checkServiceBoundaries(
				file,
				'import type {LibraryBook} from "@/bindings";',
			),
		).toEqual([]);
		expect(
			checkServiceBoundaries(
				file,
				'import {type LibraryBook} from "../bindings";',
			),
		).toEqual([]);
		for (const source of [
			'import {commands, type LibraryBook} from "@/bindings";',
			'export {commands} from "../bindings";',
			'import * as ipc from "@/bindings";',
			'void import("@tauri-apps/api/window");',
			'require("@/bindings");',
			'import ipc = require("@/bindings");',
			'import {tauriLibraryCatalog} from "@/lib/services/library-catalog/tauri";',
		]) {
			expect(checkServiceBoundaries(file, source).length).toBeGreaterThan(0);
		}
	});
	it("enforces command ownership even through aliased imports", () => {
		const file = "src/lib/services/metadata/tauri.ts";
		expect(
			checkServiceBoundaries(
				file,
				'import {commands as ipc} from "@/bindings"; ipc.clbQueryMetadataSearch("loc", "x", "");',
			),
		).toEqual([]);
		expect(
			checkServiceBoundaries(
				file,
				'import {commands as ipc} from "@/bindings"; ipc.clbCmdDeleteBooks([]);',
			)[0],
		).toContain("different service");
		expect(
			checkServiceBoundaries(
				file,
				'import {commands as ipc} from "@/bindings"; ipc["clbCmdDeleteBooks"]([]);',
			).length,
		).toBeGreaterThan(0);
		expect(
			checkServiceBoundaries(file, 'void import("@/bindings");').length,
		).toBeGreaterThan(0);
	});
	it("allows native APIs only in native Platform adapters", () => {
		const source = 'import {listen} from "@tauri-apps/api/event";';
		expect(
			checkServiceBoundaries("src/lib/platform/menu/tauri.ts", source),
		).toEqual([]);
		expect(
			checkServiceBoundaries("src/lib/services/metadata/tauri.ts", source)
				.length,
		).toBeGreaterThan(0);
	});
});
