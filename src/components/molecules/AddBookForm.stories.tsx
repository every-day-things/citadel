import type { Meta, StoryObj } from "@storybook/react";
import type { LibraryAuthor } from "@/bindings";
import { useSettings } from "@/stores/settings/store";
import { AddBookForm } from "./AddBookForm";

const meta: Meta<typeof AddBookForm> = {
	component: AddBookForm,
	argTypes: {
		fileName: {
			control: { type: "text" },
		},
		initial: {
			table: { disable: true },
		},
		authorList: {
			table: { disable: true },
		},
	},
};

export default meta;
type Story = StoryObj<typeof AddBookForm>;

const AUTHORS: LibraryAuthor[] = [
	{
		name: "Robert Pattison",
		sortable_name: "Pattison, Robert",
		id: "gid/author/1234",
		book_count: 2,
	},
	{
		name: "Frank Herbert",
		sortable_name: "Herbert, Frank",
		id: "gid/author/4321",
		book_count: 6,
	},
];

/*
 *👇 Render functions are a framework specific feature to allow you control on how the component renders.
 * See https://storybook.js.org/docs/api/csf
 * to learn how to use render functions.
 */
export const Primary: Story = {
	render: ({ fileName }) => (
		<AddBookForm
			fileName={fileName}
			initial={{
				authorList: ["Robert Pattison"],
				title: "The Batman",
			}}
			authorList={AUTHORS.map((author) => author.name)}
			onCreateAuthor={(data) => {
				console.log("Author created", data);
				return Promise.resolve();
			}}
			onSubmit={(data) => {
				console.log("Book data added", data);
				return Promise.resolve();
			}}
		/>
	),
	args: {
		fileName: "/Users/you/Downloads/your-book-from-a-drm-free-publisher.epub",
	},
};

/** Same form with a metadata source enabled, so the lookup row renders. */
export const WithMetadataSource: Story = {
	...Primary,
	decorators: [
		(Story) => {
			useSettings.setState({
				metadataProviders: {
					preferenceOrder: ["loc", "dnb", "openlibrary", "hardcover"],
					configs: { loc: { enabled: true, apiKey: "" } },
					autoLookupOnImport: false,
				},
			});
			return <Story />;
		},
	],
};
