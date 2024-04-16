import { theme } from "@/lib/theme";
import { MantineProvider } from "@mantine/core";
import type { Meta, StoryFn, StoryObj } from "@storybook/react";
import { SwitchLibraryForm } from "./SwitchLibraryForm";

const MantineForStorybook = (Story: StoryFn) => {
	return (
		<MantineProvider theme={theme} forceColorScheme="dark">
			<Story />
		</MantineProvider>
	);
};

const meta: Meta<typeof SwitchLibraryForm> = {
	component: SwitchLibraryForm,
	decorators: [MantineForStorybook],
	argTypes: {},
};

export default meta;
type Story = StoryObj<typeof SwitchLibraryForm>;

export const Primary: Story = {
	render: () => (
		<SwitchLibraryForm
			currentLibraryPath={"/path/to/library"}
			selectLibraryDirectory={() => Promise.resolve("/path/to/new/library")}
			onSubmit={(data) => console.log("Updated library path", data)}
		/>
	),
};
