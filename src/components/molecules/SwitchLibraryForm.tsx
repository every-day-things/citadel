import { safeAsyncEventHandler } from "@/lib/async";
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
				<Code mt="0">{currentLibraryPath}</Code>
			</Stack>
			{libraries.length > 1 && (
				<>
					<Title size={"sm"}>Select an existing library to switch to</Title>
					<SimpleGrid cols={3}>
						{libraries.map((library) => (
							<Button
								key={library.id}
								variant="light"
								color="blue"
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
	selectNewLibrary: () => Promise<string | undefined>;
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
					value={form.values.libraryPath}
					error={form.errors.libraryPath}
					onChange={(event) => {
						event.preventDefault();
					}}
					onPointerDown={safeAsyncEventHandler(async () => {
						const libPath = await addNewLibraryByPath();
						if (libPath === undefined) return;

						form.setFieldValue("libraryPath", libPath);
					})}
				/>
				<Button
					mt="mg"
					variant="filled"
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
