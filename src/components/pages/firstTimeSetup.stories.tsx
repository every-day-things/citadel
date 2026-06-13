import type { Meta, StoryObj } from "@storybook/react";
import { FirstTimeSetupView } from "./firstTimeSetup";

const meta: Meta<typeof FirstTimeSetupView> = {
	title: "Pages/FirstTimeSetup",
	component: FirstTimeSetupView,
	parameters: { layout: "fullscreen" },
	args: {
		onChooseFolder: () => {},
	},
};
export default meta;

type Story = StoryObj<typeof FirstTimeSetupView>;

/** Cold first launch: no library configured yet. */
export const Default: Story = {};

/** After a folder is picked, while the library is opened or created. */
export const Busy: Story = {
	args: { busy: true },
};
