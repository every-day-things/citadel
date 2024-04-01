import { MultiSelectCreatable } from "@/lib/components/ui/Multiselect/Multiselect";
import { Button, Code, Stack, Text, TextInput, Title } from "@mantine/core";
import { Form, useForm } from "@mantine/form";

interface AddBookForm {
	title: string;
	authorList: string[];
}

export interface AddBookFormProps {
	initial: AddBookForm;
	authorList: string[];
	fileName: string;
	onSubmit?: (formData: AddBookForm) => void;
}

export const AddBookForm = ({
	initial,
	authorList,
	onSubmit,
	fileName,
}: AddBookFormProps) => {
	const form = useForm({
		initialValues: initial,
	});

	return (
		<Form
			form={form}
			onSubmit={() => {
				if (onSubmit) {
					onSubmit(form.values);
				}
			}}
		>
			<Stack gap={"lg"}>
				<Title>Add new book</Title>
				<Text>
					Selected file: <Code>{fileName}</Code>{" "}
				</Text>
				<TextInput label="Title" {...form.getInputProps("title")} />
				<MultiSelectCreatable
					label="Authors"
					placeholder="Search or add author"
					selectOptions={authorList}
					onCreateSelectOption={(list, payload) =>
						console.log({ list, payload })
					}
					{...form.getInputProps("authorList")}
				/>
				<Button variant="filled" fullWidth type="submit">
					Add book
				</Button>
			</Stack>
		</Form>
	);
};
