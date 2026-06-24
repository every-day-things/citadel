import { describe, expect, it } from "vitest";
import { codeForLanguageName, languageNameForCode } from "./languages";

describe("languageNameForCode", () => {
	it("maps known codes to English names", () => {
		expect(languageNameForCode("fra")).toBe("French");
		expect(languageNameForCode("ENG")).toBe("English");
	});

	it("falls back to the uppercased code when unknown", () => {
		expect(languageNameForCode("cat")).toBe("CAT");
	});
});

describe("codeForLanguageName", () => {
	it("maps known names to ISO 639-3 codes, case-insensitively", () => {
		expect(codeForLanguageName("French")).toBe("fra");
		expect(codeForLanguageName("  spanish ")).toBe("spa");
	});

	it("lowercases anything unrecognized so it still round-trips", () => {
		expect(codeForLanguageName("ENG")).toBe("eng");
		expect(codeForLanguageName("Klingon")).toBe("klingon");
	});

	it("round-trips a known code through name and back", () => {
		expect(codeForLanguageName(languageNameForCode("deu"))).toBe("deu");
	});
});
