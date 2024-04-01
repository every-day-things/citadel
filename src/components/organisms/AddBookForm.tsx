import { MultiSelectCreatable } from "@/lib/components/ui/Multiselect/Multiselect";
import { Button, Stack, TextInput } from "@mantine/core";
import { Form, useForm } from "@mantine/form";

interface AddBookForm {
	title: string;
	authorList: string[];
}

export interface AddBookFormProps {
	initial: AddBookForm;
	authorList: string[];
	onSubmit?: (formData: AddBookForm) => void;
}

export const AddBookForm = ({
	initial,
	authorList,
	onSubmit,
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
