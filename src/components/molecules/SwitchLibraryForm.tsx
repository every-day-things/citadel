import { safeAsyncEventHandler } from "@/lib/async";
import { Button, Code, Stack, Text, TextInput, Title } from "@mantine/core";
import { Form, useForm } from "@mantine/form";

export interface SwitchLibraryForm {
	libraryPath: string;
}

export type SelectFirstLibraryProps = BaseSelectLibraryFormProps;

export const SWITCH_LIBRARY_TITLE = "Switch Library";

export const SelectFirstLibrary = (props: SelectFirstLibraryProps) => {
	return (
		<BaseSelectLibraryForm
			{...props}
			description={
				<Text>
					Select the folder where your Calibre library is. This is a folder that
					contains a metadata.db file as well as folders for each author in your
					library.
				</Text>
			}
		/>
	);
};

export interface SwitchLibraryFormProps extends BaseSelectLibraryFormProps {
	currentLibraryPath?: string;
}

export const SwitchLibraryForm = ({
	currentLibraryPath,
	...props
}: SwitchLibraryFormProps) => {
	return (
		<BaseSelectLibraryForm
			{...props}
			description={
				<Stack mb="sm" gap="xs">
					<Text mb="0">Current library:</Text>{" "}
					<Code mt="0">{currentLibraryPath}</Code>
				</Stack>
			}
		/>
	);
};

interface BaseSelectLibraryFormProps {
	onSubmit: (formData: SwitchLibraryForm) => void;
	selectLibraryDirectory: () => Promise<string | undefined>;
	hideTitle?: boolean;
	description?: React.ReactNode;
}

const BaseSelectLibraryForm = ({
	onSubmit,
	selectLibraryDirectory,
	hideTitle = false,
	description = null,
}: BaseSelectLibraryFormProps) => {
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
				{!hideTitle && <Title>{SWITCH_LIBRARY_TITLE}</Title>}
				{description}
				<TextInput
					label="Library path"
					description="This folder contains your metadata.db"
					placeholder=""
					value={form.values.libraryPath}
					error={form.errors.libraryPath}
					onChange={(event) => {
						event.preventDefault();
					}}
					onPointerDown={safeAsyncEventHandler(async () => {
						const libPath = await selectLibraryDirectory();
						if (libPath === undefined) return;

						form.setFieldValue("libraryPath", libPath);
					})}
				/>
				<Button mt="mg" variant="filled" fullWidth type="submit">
					Switch to library
				</Button>
			</Stack>
		</Form>
	);
};
