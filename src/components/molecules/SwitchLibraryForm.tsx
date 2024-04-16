import { safeAsyncEventHandler } from "@/lib/async";
import { Button, Code, Stack, Text, TextInput, Title } from "@mantine/core";
import { Form, useForm } from "@mantine/form";

export interface SwitchLibraryForm {
	libraryPath: string;
}

export interface SwitchLibraryFormProps {
	currentLibraryPath: string;
	onSubmit: (formData: SwitchLibraryForm) => void;
	selectLibraryDirectory: () => Promise<string | undefined>;
	hideTitle?: boolean;
}

export const title = "Switch Library";

export const SwitchLibraryForm = ({
	currentLibraryPath,
	onSubmit,
	selectLibraryDirectory,
	hideTitle = false,
}: SwitchLibraryFormProps) => {
	const form = useForm<SwitchLibraryForm>({
		initialValues: {
			libraryPath: "",
		},
		validate: {
			libraryPath: (value) => {
				if (value === "") {
					return "Library path is required";
				}
			}
		}
	});
	return (
		<Form
			form={form}
			onSubmit={() => {
				if (onSubmit && form.isTouched()&& form.isValid()) {
					onSubmit(form.values);
				}
			}}
		>
			<Stack gap={"lg"}>
				{!hideTitle && <Title>{title}</Title>}
				<Stack mb="sm" gap="xs">
					<Text mb="0">Current library:</Text>{" "}
					<Code mt="0">{currentLibraryPath}</Code>
				</Stack>
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
