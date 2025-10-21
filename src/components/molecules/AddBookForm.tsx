import { MultiSelectCreatable } from "@/components/atoms/Multiselect";
import { Button, Code, Stack, Text, TextInput, Title } from "@mantine/core";
import { Form, useForm } from "@mantine/form";

export interface AddBookForm {
	title: string;
	authorList: string[];
}

export interface AddBookFormProps {
	initial: AddBookForm;
	authorList: string[];
	fileName: string;
	onCreateAuthor: (newAuthorName: string) => Promise<void>;
	onSubmit?: (formData: AddBookForm) => Promise<void>;
	hideTitle?: boolean;
}

export const title = "Add new book";

export const AddBookForm = ({
	initial,
	authorList,
	onSubmit,
	fileName,
	onCreateAuthor,
	hideTitle = false,
}: AddBookFormProps) => {
	const form = useForm({
		initialValues: initial,
	});
	return (
		<Form
			form={form}
			onSubmit={() => {
				if (onSubmit) {
					void onSubmit(form.values);
				}
			}}
		>
			<Stack gap={"lg"}>
				{!hideTitle && <Title>{title}</Title>}
				<Text mb="sm">
					Selected file: <Code>{fileName}</Code>{" "}
				</Text>
				<TextInput label="Title" {...form.getInputProps("title")} />
				<MultiSelectCreatable
					label="Authors"
					placeholder="Search or add author"
					selectOptions={authorList}
					onCreateSelectOption={(name) => void onCreateAuthor(name)}
					{...form.getInputProps("authorList")}
				/>
				<Button mt="mg" variant="filled" fullWidth type="submit">
					Add book
				</Button>
			</Stack>
		</Form>
	);
};
