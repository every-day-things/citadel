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
	Switch,
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
			<Modal.Content className={classes.modalContent}>
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
							<h3 className={classes.contentTitle}>
								{TAB_META[activeTab].label}
							</h3>
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
				<span className={classes.rowLabel}>{label}</span>
				{description && (
					<span className={classes.rowDescription}>{description}</span>
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
		<div className={classes.groups}>
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
							classNames={{
								root: classes.segmentedRoot,
								indicator: classes.segmentedIndicator,
								label: classes.segmentedLabel,
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
					label="Software update"
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
		</div>
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
			<p className={classes.paneNote}>
				Something went wrong loading your libraries.
			</p>
		);
	}

	return (
		<div className={classes.groups}>
			<div className={classes.formGroup}>
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
			</div>
		</div>
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
		<div className={classes.groups}>
			<div>
				<h4 className={classes.groupTitle}>Hardcover</h4>
				<div className={classes.group}>
					<SettingsRow
						label="API key"
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
							/>
						}
					/>
					<div className={classes.row}>
						<Group gap="xs" ml="auto">
							<Button
								size="xs"
								variant="default"
								disabled={!apiKeyInput}
								onClick={() => void handleClear()}
							>
								Clear
							</Button>
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
			</div>
			{testResult && (
				<Alert
					color={testResult.success ? "green" : "red"}
					title={testResult.success ? "Success" : "Error"}
				>
					{testResult.message}
				</Alert>
			)}
		</div>
	);
};
