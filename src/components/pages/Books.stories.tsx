import type { LibraryAuthor, LibraryBook } from "@/bindings";
import type { Meta, StoryObj } from "@storybook/react";
import { BookPage } from "./EditBook";

const meta: Meta<typeof BookPage> = {
	component: BookPage,
};
export default meta;

type Story = StoryObj<typeof BookPage>;

const Bugliacci: LibraryAuthor = {
	id: "0000004JFG0DKZV4DGR66BKW9D",
	name: "Bugliacci",
	sortable_name: "Bugliacci",
};
const Gregor_Samsa: LibraryAuthor = {
	id: "0000004JFGJFYH5BDPJSENX6C8",
	name: "Gregor Samsa",
	sortable_name: "Samsa, Gregor",
};

const MOCK_BOOK: LibraryBook = {
	id: "0000004JFGPMWM6WMEEFXRKXK8",
	uuid: "01901f97-c2c5-7ce8-9546-36455c321691",
	author_list: [Bugliacci],
	description: "",
	file_list: [
		{
			Local: {
				path: "/tmp/this/path/does/not/exist",
				mime_type: "EPUB",
			},
		},
	],
	cover_image: null,
	title: "The Day I Bug'd",
	sortable_title: "Day I Bug'd, The",
	identifier_list: [
		{
			id: 123,
			label: "ISBN",
			value: "987654321",
		},
	],
};

export const Primary: Story = {
	args: {
		book: MOCK_BOOK,
		allAuthorList: [Bugliacci, Gregor_Samsa],
		onSave: (update) =>
			new Promise(() => window.alert(`Saved: ${JSON.stringify(update)}`)),
	},
};
