import { F7CircleRighthalfFill } from "@/components/icons/F7CircleRightHalfFill";
import { F7MoonFill } from "@/components/icons/F7MoonFill";
import { F7SunMaxFill } from "@/components/icons/F7SunMaxFill";
import { useThemeModal } from "@/lib/contexts/modal-theme/hooks";
import { Modal, Group, Button, useMantineColorScheme } from "@mantine/core";
import { useMemo } from "react";

export const ThemeModal = () => {
	const { setColorScheme } = useMantineColorScheme();
	const [isThemeSettingsOpen, { close: closeThemeModal }] = useThemeModal();

	const colorSchemeSetters = useMemo(() => {
		return {
			dark: () => setColorScheme("dark"),
			light: () => setColorScheme("light"),
			auto: () => setColorScheme("auto"),
		};
	}, [setColorScheme]);

	return (
		<ThemeModalPure
			isThemeSettingsOpen={isThemeSettingsOpen}
			closeThemeSettings={closeThemeModal}
			colorSchemeSetters={colorSchemeSetters}
		/>
	);
};

const ThemeModalPure = ({
	isThemeSettingsOpen = false,
	closeThemeSettings,
	colorSchemeSetters,
}: {
	isThemeSettingsOpen: boolean;
	closeThemeSettings: () => void;
	colorSchemeSetters: {
		dark: () => void;
		light: () => void;
		auto: () => void;
	};
}) => {
	return (
		<Modal
			opened={isThemeSettingsOpen}
			onClose={closeThemeSettings}
			overlayProps={{
				backgroundOpacity: 0,
			}}
			title="Choose theme"
		>
			<Group justify="space-around">
				<Button
					leftSection={<F7CircleRighthalfFill />}
					onPointerDown={colorSchemeSetters.auto}
					variant="default"
				>
					Auto
				</Button>
				<Button
					leftSection={<F7SunMaxFill title="" />}
					onPointerDown={colorSchemeSetters.light}
					variant="default"
				>
					Light
				</Button>
				<Button
					leftSection={<F7MoonFill />}
					onPointerDown={colorSchemeSetters.dark}
					variant="default"
				>
					Dark
				</Button>
			</Group>
		</Modal>
	);
};
