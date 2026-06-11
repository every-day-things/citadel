import type { BookCustomValue, CustomColumnDef, CustomValueDto } from "@/bindings";

/**
 * The label of the Calibre custom column backing the "Finished" switch.
 * It is already written through `BookUpdate.is_read`, so the custom-column
 * editor must not render (and double-write) it.
 */
export const READ_COLUMN_LABEL = "read";

/**
 * A custom-column value as held in the edit form.
 *
 * - bool: `null` (unset) | `"yes"` | `"no"`
 * - int/float: `""` (unset) | number (or an in-progress string from NumberInput)
 * - text/comments/datetime: string (`""` = unset)
 * - text with is_multiple: string[] (`[]` = unset)
 * - enumeration: `null` or `""` (unset) | one of `enum_values`
 */
export type CustomFieldValue = string | number | string[] | null;

/** Columns the editor should render inputs for. */
export const editableCustomColumns = (
	columns: CustomColumnDef[],
): CustomColumnDef[] =>
	columns.filter(
		(column) =>
			column.supported &&
			column.editable &&
			column.label !== READ_COLUMN_LABEL,
	);

/** The form value representing "no value stored" for a column. */
export const emptyFieldValue = (column: CustomColumnDef): CustomFieldValue => {
	switch (column.datatype) {
		case "bool":
		case "enumeration":
			return null;
		case "text":
			return column.is_multiple ? [] : "";
		case "int":
		case "float":
			return "";
		default:
			return "";
	}
};

/** Convert a value DTO from the backend into a form field value. */
export const fieldValueFromDto = (
	column: CustomColumnDef,
	value: CustomValueDto | null,
): CustomFieldValue => {
	if (value === null) {
		return emptyFieldValue(column);
	}
	if ("Bool" in value) {
		return value.Bool ? "yes" : "no";
	}
	if ("Int" in value) {
		return value.Int;
	}
	if ("Float" in value) {
		return value.Float;
	}
	if ("Text" in value) {
		return value.Text;
	}
	if ("TextMultiple" in value) {
		return value.TextMultiple;
	}
	if ("Datetime" in value) {
		// Edit at date-only granularity.
		return value.Datetime.slice(0, 10);
	}
	return value.Enumeration;
};

const numberFieldToValue = (value: string | number): number | null => {
	if (typeof value === "number") {
		return Number.isFinite(value) ? value : null;
	}
	const parsed = Number.parseFloat(value);
	return Number.isFinite(parsed) ? parsed : null;
};

const DATE_ONLY_PATTERN = /^\d{4}-\d{2}-\d{2}$/;

/**
 * Convert a form field value into the DTO to send to the backend.
 * `null` means "clear the stored value".
 */
export const dtoFromFieldValue = (
	column: CustomColumnDef,
	value: CustomFieldValue,
): CustomValueDto | null => {
	switch (column.datatype) {
		case "bool": {
			if (value === "yes") return { Bool: true };
			if (value === "no") return { Bool: false };
			return null;
		}
		case "int": {
			if (value === null || value === "" || Array.isArray(value)) return null;
			const parsed = numberFieldToValue(value);
			return parsed === null ? null : { Int: Math.trunc(parsed) };
		}
		case "float": {
			if (value === null || value === "" || Array.isArray(value)) return null;
			const parsed = numberFieldToValue(value);
			return parsed === null ? null : { Float: parsed };
		}
		case "text": {
			if (column.is_multiple) {
				return Array.isArray(value) && value.length > 0
					? { TextMultiple: value }
					: null;
			}
			return typeof value === "string" && value !== ""
				? { Text: value }
				: null;
		}
		case "comments": {
			return typeof value === "string" && value !== ""
				? { Text: value }
				: null;
		}
		case "datetime": {
			if (typeof value !== "string") return null;
			const trimmed = value.trim();
			if (trimmed === "") return null;
			if (DATE_ONLY_PATTERN.test(trimmed)) {
				// Date-only input: send midnight UTC.
				return { Datetime: `${trimmed}T00:00:00+00:00` };
			}
			// Pass through; the backend rejects strings that are not RFC3339.
			return { Datetime: trimmed };
		}
		case "enumeration": {
			return typeof value === "string" && value !== ""
				? { Enumeration: value }
				: null;
		}
		default:
			return null;
	}
};

/** Form field values for the given columns, keyed by column id. */
export const buildCustomFieldValues = (
	columns: CustomColumnDef[],
	values: BookCustomValue[],
): Record<string, CustomFieldValue> => {
	const valueByColumnId = new Map(
		values.map((bookValue) => [bookValue.column_id, bookValue.value]),
	);
	return Object.fromEntries(
		columns.map((column) => [
			String(column.column_id),
			fieldValueFromDto(column, valueByColumnId.get(column.column_id) ?? null),
		]),
	);
};

export interface CustomValueChange {
	columnId: number;
	value: CustomValueDto | null;
}

/**
 * The set of columns whose effective value differs between two form
 * snapshots, with the DTO to write for each.
 */
export const diffCustomValues = (
	columns: CustomColumnDef[],
	before: Record<string, CustomFieldValue>,
	after: Record<string, CustomFieldValue>,
): CustomValueChange[] => {
	const changes: CustomValueChange[] = [];
	for (const column of columns) {
		const key = String(column.column_id);
		const beforeDto = dtoFromFieldValue(
			column,
			before[key] ?? emptyFieldValue(column),
		);
		const afterDto = dtoFromFieldValue(
			column,
			after[key] ?? emptyFieldValue(column),
		);
		if (JSON.stringify(beforeDto) !== JSON.stringify(afterDto)) {
			changes.push({ columnId: column.column_id, value: afterDto });
		}
	}
	return changes;
};
