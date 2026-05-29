import { safeAsyncEventHandler } from "@/lib/async";
import type { Option } from "@/lib/option";
import {
	Button,
	Code,
	SimpleGrid,
	Stack,
	Text,
	TextInput,
	Title,
} from "@mantine/core";
import { Form, useForm } from "@mantine/form";

export interface SwitchLibraryForm {
	libraryPath: string;
}

export type SelectFirstLibraryProps = AddNewLibraryPathFomProps;

export const SelectFirstLibrary = (props: SelectFirstLibraryProps) => {
	return (
		<Stack gap={"lg"}>
			<Text>
				Select the folder where your Calibre library is. This is a folder that
				contains a metadata.db file as well as folders for each author in your
				library.
			</Text>
			<AddNewLibraryPathForm {...props} />
		</Stack>
	);
};

export interface SwitchLibraryFormProps extends AddNewLibraryPathFomProps {
	currentLibraryId: string;
	libraries: {
		id: string;
		displayName: string;
		absolutePath: string;
	}[];
	selectExistingLibrary: (id: string) => Promise<void>;
}

export const SwitchLibraryForm = ({
	currentLibraryId,
	libraries,
	selectExistingLibrary,
	...props
}: SwitchLibraryFormProps) => {
	const currentLibraryPath = libraries.find(
		(library) => library.id === currentLibraryId,
	)?.absolutePath;

	return (
		<Stack gap={"lg"}>
			<Stack mb="sm" gap="xs">
				<Text mb="0">Current library:</Text>{" "}
				<Code
					mt="0"
					style={{
						backgroundColor: "var(--ctd-control-bg)",
						border: "1px solid var(--ctd-border)",
					}}
				>
					{currentLibraryPath}
				</Code>
			</Stack>
			{libraries.length > 1 && (
				<>
					<Title size={"sm"}>Select an existing library to switch to</Title>
					<SimpleGrid cols={3}>
						{libraries.map((library) => (
							<Button
								key={library.id}
								variant="outline"
								color="sepia"
								styles={{
									root: {
										"&:disabled, &[data-disabled]": {
											backgroundColor: "var(--ctd-control-disabled-bg)",
											borderColor: "var(--ctd-control-disabled-border)",
											color: "var(--ctd-control-disabled-text)",
											opacity: 1,
										},
									},
								}}
								disabled={library.id === currentLibraryId}
								onPointerUp={safeAsyncEventHandler(async () => {
									if (library.id === currentLibraryId) return;
									await selectExistingLibrary(library.id);
								})}
							>
								{library.displayName}
							</Button>
						))}
					</SimpleGrid>
				</>
			)}
			<AddNewLibraryPathForm {...props} />
		</Stack>
	);
};

interface AddNewLibraryPathFomProps {
	onSubmit: (formData: SwitchLibraryForm) => void;
	selectNewLibrary: () => Promise<Option<string>>;
}

const AddNewLibraryPathForm = ({
	onSubmit,
	selectNewLibrary: addNewLibraryByPath,
}: AddNewLibraryPathFomProps) => {
	const form = useForm<SwitchLibraryForm>({
		initialValues: {
			libraryPath: "",
		},
		validate: {
			libraryPath: (value) => {
				if (value === "") {
					return "Library path is required";
				}
			},
		},
	});

	return (
		<Form
			form={form}
			onSubmit={() => {
				if (onSubmit && form.isTouched() && form.isValid()) {
					onSubmit(form.values);
				}
			}}
		>
			<Stack gap={"lg"}>
				<TextInput
					label="Library path"
					description="This folder contains your metadata.db"
					placeholder=""
					styles={{
						label: {
							color: "var(--ctd-ink-soft)",
						},
						description: {
							color: "var(--ctd-ink-soft)",
						},
						input: {
							backgroundColor: "var(--ctd-control-bg)",
							borderColor: "var(--ctd-border)",
							color: "var(--ctd-control-text)",
						},
					}}
					value={form.values.libraryPath}
					error={form.errors.libraryPath}
					onChange={(event) => {
						event.preventDefault();
					}}
					onPointerDown={safeAsyncEventHandler(async () => {
						const libPathOption = await addNewLibraryByPath();
						if (!libPathOption.isSome) return;

						form.setFieldValue("libraryPath", libPathOption.value);
					})}
				/>
				<Button
					mt="mg"
					variant="filled"
					color="sepia"
					styles={{
						root: {
							"&:disabled, &[data-disabled]": {
								backgroundColor: "var(--ctd-control-disabled-bg)",
								borderColor: "var(--ctd-control-disabled-border)",
								color: "var(--ctd-control-disabled-text)",
								opacity: 1,
							},
						},
					}}
					fullWidth
					type="submit"
					disabled={!form.values.libraryPath}
				>
					Add library
				</Button>
			</Stack>
		</Form>
	);
};
