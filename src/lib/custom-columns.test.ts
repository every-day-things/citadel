import type { CustomColumnDef } from "@/bindings";
import { describe, expect, it } from "vitest";
import {
	buildCustomFieldValues,
	diffCustomValues,
	dtoFromFieldValue,
	editableCustomColumns,
	fieldValueFromDto,
} from "./custom-columns";

const column = (overrides: Partial<CustomColumnDef>): CustomColumnDef => ({
	column_id: 1,
	label: "mycolumn",
	name: "My Column",
	datatype: "text",
	is_multiple: false,
	editable: true,
	supported: true,
	enum_values: [],
	...overrides,
});

describe("editableCustomColumns", () => {
	it("keeps only supported, editable columns", () => {
		const columns = [
			column({ column_id: 1, label: "rating", supported: false }),
			column({ column_id: 2, label: "notes", editable: false }),
			column({ column_id: 3, label: "mood" }),
		];

		expect(editableCustomColumns(columns).map((c) => c.column_id)).toEqual([
			3,
		]);
	});

	it("excludes the read column, which is written through BookUpdate", () => {
		const columns = [
			column({ column_id: 1, label: "read", datatype: "bool" }),
			column({ column_id: 2, label: "mood" }),
		];

		expect(editableCustomColumns(columns).map((c) => c.column_id)).toEqual([
			2,
		]);
	});
});

describe("fieldValueFromDto", () => {
	it("maps missing values to the column's empty value", () => {
		expect(fieldValueFromDto(column({ datatype: "bool" }), null)).toBeNull();
		expect(fieldValueFromDto(column({ datatype: "int" }), null)).toBe("");
		expect(fieldValueFromDto(column({ datatype: "text" }), null)).toBe("");
		expect(
			fieldValueFromDto(column({ datatype: "text", is_multiple: true }), null),
		).toEqual([]);
		expect(
			fieldValueFromDto(column({ datatype: "enumeration" }), null),
		).toBeNull();
	});

	it("maps booleans to yes/no", () => {
		const bool = column({ datatype: "bool" });
		expect(fieldValueFromDto(bool, { Bool: true })).toBe("yes");
		expect(fieldValueFromDto(bool, { Bool: false })).toBe("no");
	});

	it("maps numbers, text, and lists through unchanged", () => {
		expect(fieldValueFromDto(column({ datatype: "int" }), { Int: 42 })).toBe(
			42,
		);
		expect(
			fieldValueFromDto(column({ datatype: "float" }), { Float: 3.5 }),
		).toBe(3.5);
		expect(
			fieldValueFromDto(column({ datatype: "text" }), { Text: "hello" }),
		).toBe("hello");
		expect(
			fieldValueFromDto(column({ datatype: "text", is_multiple: true }), {
				TextMultiple: ["a", "b"],
			}),
		).toEqual(["a", "b"]);
		expect(
			fieldValueFromDto(column({ datatype: "enumeration" }), {
				Enumeration: "good",
			}),
		).toBe("good");
	});

	it("truncates datetimes to date-only for editing", () => {
		expect(
			fieldValueFromDto(column({ datatype: "datetime" }), {
				Datetime: "2024-01-15T10:30:00+00:00",
			}),
		).toBe("2024-01-15");
	});
});

describe("dtoFromFieldValue", () => {
	it("maps empty values to null (clear)", () => {
		expect(dtoFromFieldValue(column({ datatype: "bool" }), null)).toBeNull();
		expect(dtoFromFieldValue(column({ datatype: "int" }), "")).toBeNull();
		expect(dtoFromFieldValue(column({ datatype: "float" }), "")).toBeNull();
		expect(dtoFromFieldValue(column({ datatype: "text" }), "")).toBeNull();
		expect(
			dtoFromFieldValue(column({ datatype: "text", is_multiple: true }), []),
		).toBeNull();
		expect(dtoFromFieldValue(column({ datatype: "comments" }), "")).toBeNull();
		expect(
			dtoFromFieldValue(column({ datatype: "datetime" }), "  "),
		).toBeNull();
		expect(
			dtoFromFieldValue(column({ datatype: "enumeration" }), null),
		).toBeNull();
		expect(
			dtoFromFieldValue(column({ datatype: "enumeration" }), ""),
		).toBeNull();
	});

	it("maps yes/no to booleans", () => {
		const bool = column({ datatype: "bool" });
		expect(dtoFromFieldValue(bool, "yes")).toEqual({ Bool: true });
		expect(dtoFromFieldValue(bool, "no")).toEqual({ Bool: false });
	});

	it("truncates int values and parses in-progress number strings", () => {
		const int = column({ datatype: "int" });
		expect(dtoFromFieldValue(int, 7)).toEqual({ Int: 7 });
		expect(dtoFromFieldValue(int, 7.9)).toEqual({ Int: 7 });
		expect(dtoFromFieldValue(int, "12")).toEqual({ Int: 12 });
		expect(dtoFromFieldValue(int, "-")).toBeNull();

		const float = column({ datatype: "float" });
		expect(dtoFromFieldValue(float, 2.25)).toEqual({ Float: 2.25 });
		expect(dtoFromFieldValue(float, "2.5")).toEqual({ Float: 2.5 });
	});

	it("maps text by multiplicity, and comments to Text", () => {
		expect(dtoFromFieldValue(column({ datatype: "text" }), "hi")).toEqual({
			Text: "hi",
		});
		expect(
			dtoFromFieldValue(column({ datatype: "text", is_multiple: true }), [
				"a",
				"b",
			]),
		).toEqual({ TextMultiple: ["a", "b"] });
		expect(
			dtoFromFieldValue(column({ datatype: "comments" }), "note"),
		).toEqual({ Text: "note" });
	});

	it("sends midnight UTC for date-only datetime input", () => {
		expect(
			dtoFromFieldValue(column({ datatype: "datetime" }), "2024-01-15"),
		).toEqual({ Datetime: "2024-01-15T00:00:00+00:00" });
	});

	it("passes full datetime strings through for backend validation", () => {
		expect(
			dtoFromFieldValue(
				column({ datatype: "datetime" }),
				"2024-01-15T10:30:00+00:00",
			),
		).toEqual({ Datetime: "2024-01-15T10:30:00+00:00" });
	});

	it("maps enumeration selections", () => {
		expect(
			dtoFromFieldValue(
				column({ datatype: "enumeration", enum_values: ["good", "bad"] }),
				"good",
			),
		).toEqual({ Enumeration: "good" });
	});
});

describe("buildCustomFieldValues", () => {
	it("keys values by column id and fills gaps with empty values", () => {
		const columns = [
			column({ column_id: 1, datatype: "bool" }),
			column({ column_id: 2, datatype: "text" }),
		];

		expect(
			buildCustomFieldValues(columns, [
				{ column_id: 2, value: { Text: "hello" } },
			]),
		).toEqual({ "1": null, "2": "hello" });
	});
});

describe("diffCustomValues", () => {
	const columns = [
		column({ column_id: 1, datatype: "bool" }),
		column({ column_id: 2, datatype: "text" }),
		column({ column_id: 3, datatype: "datetime" }),
	];

	it("returns only the columns whose effective value changed", () => {
		const before = { "1": null, "2": "old", "3": "2024-01-15" };
		const after = { "1": "yes", "2": "old", "3": "2024-01-15" };

		expect(diffCustomValues(columns, before, after)).toEqual([
			{ columnId: 1, value: { Bool: true } },
		]);
	});

	it("emits null when a value is cleared", () => {
		const before = { "1": "yes", "2": "old", "3": "2024-01-15" };
		const after = { "1": "yes", "2": "", "3": "2024-01-15" };

		expect(diffCustomValues(columns, before, after)).toEqual([
			{ columnId: 2, value: null },
		]);
	});

	it("treats missing keys as the column's empty value", () => {
		expect(diffCustomValues(columns, {}, { "1": null, "2": "" })).toEqual([]);
	});

	it("does not report equivalent number strings as changes", () => {
		const int = [column({ column_id: 4, datatype: "int" })];
		expect(diffCustomValues(int, { "4": 12 }, { "4": "12" })).toEqual([]);
	});
});
