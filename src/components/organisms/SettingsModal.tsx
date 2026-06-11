import type { SettingsTab } from "@/lib/contexts/modal-settings/context";
import type { ReactNode } from "react";
import { commands } from "@/bindings";
import { F7BookFill } from "@/components/icons/F7BookFill";
import { F7Gear } from "@/components/icons/F7Gear";
import { FluentLibraryFilled } from "@/components/icons/FluentLibraryFilled";
import { SwitchLibraryForm } from "@/components/molecules/SwitchLibraryForm";
import classes from "@/components/organisms/SettingsModal.module.css";
import { SETTINGS_TABS } from "@/lib/contexts/modal-settings/context";
import { useSettingsModal } from "@/lib/contexts/modal-settings/hooks";
import { useAppUpdates } from "@/lib/hooks/use-app-updates";
import { none, some } from "@/lib/option";
import { usePlatform } from "@/lib/platform/context";
import { createLibrary, setActiveLibrary } from "@/stores/settings/actions";
import { useSettings } from "@/stores/settings/store";
import {
	Alert,
	Button,
	CloseButton,
	Group,
	Modal,
	SegmentedControl,
	Stack,
	Switch,
	Text,
	TextInput,
	UnstyledButton,
	useMantineColorScheme,
} from "@mantine/core";
import { useCallback, useEffect, useState } from "react";

const TAB_META: Record<
	SettingsTab,
	{ label: string; icon: (className: string | undefined) => ReactNode }
> = {
	general: {
		label: "General",
		icon: (className) => <F7Gear className={className} />,
	},
	library: {
		label: "Library",
		icon: (className) => <FluentLibraryFilled className={className} />,
	},
	integrations: {
		label: "Integrations",
		icon: (className) => <F7BookFill className={className} />,
	},
};

export const SettingsModal = () => {
	const { isOpen, activeTab, close, setActiveTab } = useSettingsModal();
	const { setColorScheme } = useMantineColorScheme();
	const theme = useSettings((state) => state.theme);

	// Keep Mantine's color scheme in sync with the persisted theme.
	useEffect(() => {
		setColorScheme(theme);
	}, [theme, setColorScheme]);

	return (
		<Modal.Root opened={isOpen} onClose={close} size={640} centered>
			<Modal.Overlay backgroundOpacity={0.35} blur={3} />
			<Modal.Content
				style={{
					background: "var(--ctd-drawer-gradient)",
					border: "1px solid var(--ctd-border)",
					overflow: "hidden",
				}}
			>
				<div className={classes.pane}>
					<nav className={classes.nav} aria-label="Settings sections">
						<h2 className={classes.navHeading}>Settings</h2>
						{SETTINGS_TABS.map((tab) => (
							<UnstyledButton
								key={tab}
								className={classes.navItem}
								aria-current={tab === activeTab ? "true" : undefined}
								onClick={() => setActiveTab(tab)}
							>
								{TAB_META[tab].icon(classes.navItemIcon)}
								{TAB_META[tab].label}
							</UnstyledButton>
						))}
					</nav>
					<div className={classes.content}>
						<header className={classes.contentHeader}>
							<Text
								size="sm"
								fw={600}
								component="h3"
								style={{ margin: 0, color: "var(--ctd-ink)" }}
							>
								{TAB_META[activeTab].label}
							</Text>
							<CloseButton
								size="sm"
								aria-label="Close settings"
								onClick={close}
							/>
						</header>
						<div className={classes.contentBody}>
							{activeTab === "general" && <GeneralTab />}
							{activeTab === "library" && <LibraryTab closeSettings={close} />}
							{activeTab === "integrations" && <IntegrationsTab />}
						</div>
					</div>
				</div>
			</Modal.Content>
		</Modal.Root>
	);
};

interface SettingsRowProps {
	label: string;
	description?: string;
	control: ReactNode;
}

const SettingsRow = ({ label, description, control }: SettingsRowProps) => {
	return (
		<div className={classes.row}>
			<div className={classes.rowLabels}>
				<Text size="sm" style={{ color: "var(--ctd-ink)" }}>
					{label}
				</Text>
				{description && (
					<Text size="xs" style={{ color: "var(--ctd-ink-soft)" }}>
						{description}
					</Text>
				)}
			</div>
			{control}
		</div>
	);
};

const GeneralTab = () => {
	const { setColorScheme } = useMantineColorScheme();
	const theme = useSettings((state) => state.theme);
	const setTheme = useSettings((state) => state.setTheme);
	const autoUpdateCheckingEnabled = useSettings(
		(state) => state.autoUpdateCheckingEnabled,
	);
	const setAutoUpdateCheckingEnabled = useSettings(
		(state) => state.setAutoUpdateCheckingEnabled,
	);

	const platform = usePlatform();
	const supportsAutoUpdates = platform.capabilities.supportsAutoUpdates;
	const isCheckingForUpdates = useAppUpdates(
		(state) => state.isCheckingForUpdates,
	);
	const checkForUpdatesNow = useAppUpdates((state) => state.checkForUpdatesNow);

	const applyTheme = useCallback(
		(value: string) => {
			const scheme =
				value === "light" || value === "dark" ? value : ("auto" as const);
			setColorScheme(scheme);
			void setTheme(scheme);
		},
		[setColorScheme, setTheme],
	);

	return (
		<Stack gap="md">
			<div className={classes.group}>
				<SettingsRow
					label="Appearance"
					control={
						<SegmentedControl
							size="xs"
							radius="sm"
							value={theme}
							onChange={applyTheme}
							data={[
								{ value: "auto", label: "Auto" },
								{ value: "light", label: "Light" },
								{ value: "dark", label: "Dark" },
							]}
							styles={{
								root: {
									backgroundColor: "var(--ctd-segmented-root-bg)",
									border: "1px solid var(--ctd-border)",
								},
								indicator: {
									backgroundColor: "var(--ctd-segmented-indicator-bg)",
								},
								label: {
									color: "var(--ctd-segmented-label)",
								},
							}}
						/>
					}
				/>
			</div>
			<div className={classes.group}>
				<SettingsRow
					label="Check for updates automatically"
					control={
						<Switch
							size="sm"
							checked={autoUpdateCheckingEnabled}
							disabled={!supportsAutoUpdates}
							aria-label="Check for updates automatically"
							onChange={(event) =>
								void setAutoUpdateCheckingEnabled(event.currentTarget.checked)
							}
						/>
					}
				/>
				<SettingsRow
					label="Updates"
					description={
						supportsAutoUpdates
							? undefined
							: "Updates are not supported on this platform."
					}
					control={
						<Button
							size="xs"
							variant="default"
							loading={isCheckingForUpdates}
							disabled={!supportsAutoUpdates}
							onClick={() => void checkForUpdatesNow(supportsAutoUpdates)}
						>
							Check for Updates…
						</Button>
					}
				/>
			</div>
		</Stack>
	);
};

interface LibraryTabProps {
	closeSettings: () => void;
}

const LibraryTab = ({ closeSettings }: LibraryTabProps) => {
	const libraries = useSettings((state) => state.libraryPaths);
	const activeLibraryId = useSettings((state) => state.activeLibraryId);
	const platform = usePlatform();

	const addNewLibraryByPath = useCallback(
		async (form: SwitchLibraryForm) => {
			const isPathValidLibrary = await commands.clbQueryIsPathValidLibrary(
				form.libraryPath,
			);

			if (isPathValidLibrary) {
				const newLibraryId = await createLibrary(form.libraryPath);
				await setActiveLibrary(newLibraryId);
				closeSettings();
			} else {
				// TODO: You could create a new library, if you like.
				console.error("Invalid library path selected");
			}
		},
		[closeSettings],
	);

	const selectExistingLibrary = useCallback(
		async (id: string) => {
			await setActiveLibrary(id);
			closeSettings();
		},
		[closeSettings],
	);

	if (!activeLibraryId) {
		return (
			<Text size="sm" style={{ color: "var(--ctd-ink-soft)" }}>
				Something went wrong loading your libraries.
			</Text>
		);
	}

	return (
		<SwitchLibraryForm
			currentLibraryId={activeLibraryId}
			libraries={libraries}
			onSubmit={(form) => void addNewLibraryByPath(form)}
			selectExistingLibrary={selectExistingLibrary}
			selectNewLibrary={async () => {
				const path = await platform.dialogs.openDirectory({
					title: "Select Calibre Library Folder",
				});
				return path !== null ? some(path) : none();
			}}
		/>
	);
};

const IntegrationsTab = () => {
	const hardcoverApiKey = useSettings((state) => state.hardcoverApiKey);
	const setHardcoverApiKey = useSettings((state) => state.setHardcoverApiKey);

	const [apiKeyInput, setApiKeyInput] = useState(hardcoverApiKey);
	const [isTesting, setIsTesting] = useState(false);
	const [testResult, setTestResult] = useState<{
		success: boolean;
		message: string;
	} | null>(null);

	const handleSave = useCallback(async () => {
		await setHardcoverApiKey(apiKeyInput);
		setTestResult(null);
	}, [apiKeyInput, setHardcoverApiKey]);

	const handleTest = useCallback(async () => {
		setIsTesting(true);
		setTestResult(null);

		try {
			const result = await commands.testHardcoverConnection(apiKeyInput);
			if (result.status === "ok") {
				setTestResult({
					success: result.data.is_valid,
					message: result.data.message,
				});
			} else {
				setTestResult({ success: false, message: result.error });
			}
		} catch (error) {
			setTestResult({
				success: false,
				message: `Error: ${
					error instanceof Error ? error.message : String(error)
				}`,
			});
		} finally {
			setIsTesting(false);
		}
	}, [apiKeyInput]);

	const handleClear = useCallback(async () => {
		setApiKeyInput("");
		await setHardcoverApiKey("");
		setTestResult(null);
	}, [setHardcoverApiKey]);

	return (
		<Stack gap="md">
			<div className={classes.group}>
				<SettingsRow
					label="Hardcover API key"
					description="Found in your Hardcover account settings."
					control={
						<TextInput
							size="xs"
							w={220}
							type="password"
							placeholder="API key"
							aria-label="Hardcover API key"
							value={apiKeyInput}
							onChange={(event) => setApiKeyInput(event.currentTarget.value)}
							styles={{
								input: {
									backgroundColor: "var(--ctd-control-bg)",
									borderColor: "var(--ctd-border)",
									color: "var(--ctd-control-text)",
								},
							}}
						/>
					}
				/>
				<div className={classes.row}>
					<Button
						size="xs"
						variant="subtle"
						color="red"
						disabled={!apiKeyInput}
						onClick={() => void handleClear()}
					>
						Clear
					</Button>
					<Group gap="xs">
						<Button
							size="xs"
							variant="default"
							loading={isTesting}
							disabled={!apiKeyInput}
							onClick={() => void handleTest()}
						>
							Test Connection
						</Button>
						<Button
							size="xs"
							disabled={!apiKeyInput}
							onClick={() => void handleSave()}
						>
							Save
						</Button>
					</Group>
				</div>
			</div>
			{testResult && (
				<Alert
					color={testResult.success ? "green" : "red"}
					title={testResult.success ? "Success" : "Error"}
				>
					{testResult.message}
				</Alert>
			)}
		</Stack>
	);
};
