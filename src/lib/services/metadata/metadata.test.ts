import { beforeEach, describe, expect, it, vi } from "vitest";
const ipc = vi.hoisted(() => ({
	clbQueryMetadataSearch: vi.fn(),
	clbQueryMetadataByIsbn: vi.fn(),
	clbCmdTestMetadataProvider: vi.fn(),
}));
vi.mock("@/bindings", () => ({ commands: ipc }));
import { tauriMetadataService } from "./tauri";
import { webMetadataService } from "./web";

describe("Metadata transport", () => {
	beforeEach(() => vi.resetAllMocks());
	it("preserves provider selection, credentials and provider-reported failures", async () => {
		ipc.clbQueryMetadataSearch.mockResolvedValue({ status: "ok", data: [] });
		expect(
			await tauriMetadataService.search("hardcover", "a title", "key"),
		).toEqual([]);
		expect(ipc.clbQueryMetadataSearch).toHaveBeenCalledWith(
			"hardcover",
			"a title",
			"key",
		);
		ipc.clbCmdTestMetadataProvider.mockResolvedValue({
			status: "error",
			error: "invalid key",
		});
		expect(await tauriMetadataService.test("hardcover", "bad")).toEqual({
			ok: false,
			message: "invalid key",
		});
		ipc.clbQueryMetadataByIsbn.mockResolvedValue({
			status: "error",
			error: "provider unavailable",
		});
		await expect(
			tauriMetadataService.byIsbn("loc", "9781234567890", ""),
		).rejects.toThrow("provider unavailable");
	});
	it("does not invoke Tauri when metadata is unavailable in a browser", async () => {
		await expect(
			webMetadataService.search("loc", "a title", ""),
		).rejects.toThrow("unavailable");
		expect((await webMetadataService.test("loc", "")).ok).toBe(false);
		for (const method of Object.values(ipc))
			expect(method).not.toHaveBeenCalled();
	});
});
