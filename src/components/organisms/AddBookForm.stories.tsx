import { LibraryAuthor } from "@/bindings";
import { resolver, theme } from "@/lib/theme";
import { MantineProvider } from "@mantine/core";
import type { Meta, StoryFn, StoryObj } from "@storybook/react";
import { AddBookForm } from "./AddBookForm";

const MantineForStorybook = (Story: StoryFn) => {
	return (
		<MantineProvider theme={theme} forceColorScheme="dark" cssVariablesResolver={resolver}>
			<Story />
		</MantineProvider>
	);
};

const meta: Meta<typeof AddBookForm> = {
	component: AddBookForm,
	decorators: [MantineForStorybook],
};

export default meta;
type Story = StoryObj<typeof AddBookForm>;

const AUTHORS: LibraryAuthor[] = [
	{
		name: "Robert Pattison",
		sortable_name: "Pattison, Robert",
		id: "gid/author/1234",
	},
	{
		name: "Frank Herbert",
		sortable_name: "Herbert, Frank",
		id: "gid/author/4321",
	},
];

/*
 *👇 Render functions are a framework specific feature to allow you control on how the component renders.
 * See https://storybook.js.org/docs/api/csf
 * to learn how to use render functions.
 */
export const Primary: Story = {
	render: () => (
		<AddBookForm
			initial={{
				authorList: ["Robert Pattison"],
				title: "The Batman",
			}}
			authorList={AUTHORS.map((author) => author.name)}
			onSubmit={(data) => console.log("Book data added", data)}
		/>
	),
};
