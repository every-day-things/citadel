import {
	CheckIcon,
	Combobox,
	Group,
	Pill,
	PillsInput,
	useCombobox,
} from "@mantine/core";
import { useUncontrolled } from "@mantine/hooks";
import { useState } from "react";

interface BaseProps<T> {
	label: string;
	placeholder?: string;
	value?: T[];
	onChange?: (updated: T[]) => void;
}

type MultiSelectCreatableProps = BaseProps<string> & {
	selectOptions: string[];
	onCreateSelectOption?: (newList: string[], ...payload: unknown[]) => void;
};

export function MultiSelectCreatable({
	label,
	placeholder,
	selectOptions,
	onCreateSelectOption,

	value,
	onChange,
}: MultiSelectCreatableProps): React.ReactNode {
	const [_value, setValue] = useUncontrolled<string[]>({
		value,
		defaultValue: [],
		finalValue: [],
		onChange,
	});
	const [_data, setData] = useUncontrolled<string[]>({
		defaultValue: selectOptions,
		onChange: onCreateSelectOption,
	});
	const combobox = useCombobox({
		onDropdownClose: () => combobox.resetSelectedOption(),
		onDropdownOpen: () => combobox.updateSelectedOptionIndex("active"),
	});
	const [search, setSearch] = useState("");

	const exactOptionMatch = _data.some((item) => item === search);

	const handleValueSelect = (val: string) => {
		setSearch("");

		if (val === "$create") {
			setData([..._data, search]);
			setValue([..._value, search]);
		} else {
			const isItemRemoval = _value.includes(val);
			if (isItemRemoval) {
				handleValueRemove(val);
				return;
			}

			const newValue = [..._value, val];
			setValue(newValue);
		}
	};

	const handleValueRemove = (val: string) => {
		// TODO: Test that deselecting elements in the pick list AND by pill removes
		// them from the list of pills
		setValue(_value.filter((v) => v !== val));
		// TODO: Test that deselecting new elements that are not in `selectOptions`
		// removes them from the select list.
		if (!selectOptions.includes(val)) {
			setData(_data.filter((v) => v !== val));
		}
	};

	const values = _value.map((item) => (
		<Pill key={item} withRemoveButton onRemove={() => handleValueRemove(item)}>
			{item}
		</Pill>
	));

	const options = _data
		.filter((item) => item.toLowerCase().includes(search.trim().toLowerCase()))
		.map((item) => (
			<Combobox.Option value={item} key={item} active={_value.includes(item)}>
				<Group gap="sm">
					{_value.includes(item) ? <CheckIcon size={12} /> : null}
					<span>{item}</span>
				</Group>
			</Combobox.Option>
		));

	return (
		<Combobox
			store={combobox}
			onOptionSubmit={handleValueSelect}
			withinPortal={false}
		>
			<Combobox.DropdownTarget>
				<PillsInput onClick={() => combobox.openDropdown()} label={label}>
					<Pill.Group>
						{values}

						<Combobox.EventsTarget>
							<PillsInput.Field
								onFocus={() => combobox.openDropdown()}
								onBlur={() => combobox.closeDropdown()}
								value={search}
								placeholder={placeholder}
								onChange={(event) => {
									combobox.updateSelectedOptionIndex();
									setSearch(event.currentTarget.value);
								}}
								onKeyDown={(event) => {
									if (event.key === "Backspace" && search.length === 0) {
										event.preventDefault();
										handleValueRemove(_value[_value.length - 1]);
									}
								}}
							/>
						</Combobox.EventsTarget>
					</Pill.Group>
				</PillsInput>
			</Combobox.DropdownTarget>

			<Combobox.Dropdown>
				<Combobox.Options
					style={{
						maxHeight: "10rem",
						overflowY: "scroll",
					}}
				>
					{options}

					{!exactOptionMatch && search.trim().length > 0 && (
						<Combobox.Option value="$create">+ Create {search}</Combobox.Option>
					)}

					{exactOptionMatch &&
						search.trim().length > 0 &&
						options.length === 0 && (
							<Combobox.Empty>Nothing found</Combobox.Empty>
						)}
				</Combobox.Options>
			</Combobox.Dropdown>
		</Combobox>
	);
}
