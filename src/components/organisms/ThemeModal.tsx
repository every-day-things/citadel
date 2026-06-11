import { F7CircleRighthalfFill } from "@/components/icons/F7CircleRightHalfFill";
import { F7MoonFill } from "@/components/icons/F7MoonFill";
import { F7SunMaxFill } from "@/components/icons/F7SunMaxFill";
import { useThemeModal } from "@/lib/contexts/modal-theme/hooks";
import { useSettings } from "@/stores/settings/store";
import { Button, Group, Modal, useMantineColorScheme } from "@mantine/core";
import { useMemo, useEffect } from "react";

export const ThemeModal = () => {
	const { setColorScheme } = useMantineColorScheme();
	const [isThemeSettingsOpen, { close: closeThemeModal }] = useThemeModal();
	const theme = useSettings((state) => state.theme);
	const setTheme = useSettings((state) => state.setTheme);

	// Sync Mantine color scheme with persisted theme on mount
	useEffect(() => {
		setColorScheme(theme);
	}, [theme, setColorScheme]);

	const colorSchemeSetters = useMemo(() => {
		return {
			dark: () => {
				setColorScheme("dark");
				void setTheme("dark");
			},
			light: () => {
				setColorScheme("light");
				void setTheme("light");
			},
			auto: () => {
				setColorScheme("auto");
				void setTheme("auto");
			},
		};
	}, [setColorScheme, setTheme]);

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
				blur: 0,
			}}
			title="Choose theme"
			styles={{
				content: {
					background: "var(--ctd-drawer-gradient)",
					border: "1px solid var(--ctd-border)",
				},
				header: {
					backgroundColor: "transparent",
					borderBottom: "1px solid var(--ctd-border)",
				},
				title: {
					color: "var(--ctd-ink)",
				},
				close: {
					border: "1px solid var(--ctd-border)",
					backgroundColor: "var(--ctd-control-bg)",
				},
				body: {
					paddingTop: "0.9rem",
				},
			}}
		>
			<Group justify="space-around">
				<Button
					leftSection={<F7CircleRighthalfFill />}
					onPointerDown={colorSchemeSetters.auto}
					variant="outline"
					color="accent"
				>
					Auto
				</Button>
				<Button
					leftSection={<F7SunMaxFill title="" />}
					onPointerDown={colorSchemeSetters.light}
					variant="outline"
					color="accent"
				>
					Light
				</Button>
				<Button
					leftSection={<F7MoonFill />}
					onPointerDown={colorSchemeSetters.dark}
					variant="outline"
					color="accent"
				>
					Dark
				</Button>
			</Group>
		</Modal>
	);
};
