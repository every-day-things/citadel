import type { ReactNode } from "react";
import { useCallback, useId, useState } from "react";
import { commands } from "@/bindings";
import { F7BookFill } from "@/components/icons/F7BookFill";
import { F7Gear } from "@/components/icons/F7Gear";
import { FluentLibraryFilled } from "@/components/icons/FluentLibraryFilled";
import { SwitchLibraryForm } from "@/components/molecules/SwitchLibraryForm";
import classes from "@/components/organisms/SettingsPanes.module.css";
import { Button, SegmentedControl, Switch, TextInput } from "@/components/ui";
import { useAppUpdates } from "@/lib/hooks/use-app-updates";
import { none, some } from "@/lib/option";
import { usePlatform } from "@/lib/platform/context";
import { applyColorScheme } from "@/lib/theme-manager";
import { createLibrary, setActiveLibrary } from "@/stores/settings/actions";
import { useSettings } from "@/stores/settings/store";

const SETTINGS_TABS = ["general", "library", "integrations"] as const;
type SettingsTab = (typeof SETTINGS_TABS)[number];

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

interface SettingsPanesProps {
	/**
	 * Called when a pane wants to dismiss settings, e.g. after switching
	 * libraries. In the settings window this hides the window.
	 */
	onRequestClose?: () => void;
}

/**
 * The System Settings style rail + content layout, rendered full-window by
 * the `/settings` route. The window's native title bar already says
 * "Settings", so the pane renders no title bar of its own.
 */
export const SettingsPanes = ({ onRequestClose }: SettingsPanesProps) => {
	const [activeTab, setActiveTab] = useState<SettingsTab>("general");

	const close = useCallback(() => {
		onRequestClose?.();
	}, [onRequestClose]);

	return (
		<div className={classes.pane}>
			<nav className={classes.nav} aria-label="Settings sections">
				{SETTINGS_TABS.map((tab) => (
					<button
						key={tab}
						type="button"
						className={classes.navItem}
						aria-current={tab === activeTab ? "true" : undefined}
						onClick={() => setActiveTab(tab)}
					>
						{TAB_META[tab].icon(classes.navItemIcon)}
						{TAB_META[tab].label}
					</button>
				))}
			</nav>
			<div className={classes.content}>
				<header className={classes.contentHeader}>
					<h3 className={classes.contentTitle}>{TAB_META[activeTab].label}</h3>
				</header>
				<div className={classes.contentBody}>
					{activeTab === "general" && <GeneralTab />}
					{activeTab === "library" && <LibraryTab closeSettings={close} />}
					{activeTab === "integrations" && <IntegrationsTab />}
				</div>
			</div>
		</div>
	);
};

interface SettingsRowProps {
	label: string;
	description?: string;
	control: ReactNode;
	/** When set, the row label becomes a <label> for that control id. */
	htmlFor?: string;
}

const SettingsRow = ({
	label,
	description,
	control,
	htmlFor,
}: SettingsRowProps) => {
	return (
		<div className={classes.row}>
			<div className={classes.rowLabels}>
				{htmlFor ? (
					<label className={classes.rowLabel} htmlFor={htmlFor}>
						{label}
					</label>
				) : (
					<span className={classes.rowLabel}>{label}</span>
				)}
				{description && (
					<span className={classes.rowDescription}>{description}</span>
				)}
			</div>
			{control}
		</div>
	);
};

const GeneralTab = () => {
	const theme = useSettings((state) => state.theme);
	const setTheme = useSettings((state) => state.setTheme);
	const autoUpdateCheckingEnabled = useSettings(
		(state) => state.autoUpdateCheckingEnabled,
	);
	const setAutoUpdateCheckingEnabled = useSettings(
		(state) => state.setAutoUpdateCheckingEnabled,
	);
	const autoUpdateSwitchId = useId();

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
			applyColorScheme(scheme);
			void setTheme(scheme);
		},
		[setTheme],
	);

	return (
		<div className={classes.groups}>
			<div className={classes.group}>
				<SettingsRow
					label="Appearance"
					control={
						<SegmentedControl
							aria-label="Appearance"
							value={theme}
							onChange={applyTheme}
							items={[
								{ value: "auto", label: "Auto" },
								{ value: "light", label: "Light" },
								{ value: "dark", label: "Dark" },
							]}
						/>
					}
				/>
			</div>
			<div className={classes.group}>
				<SettingsRow
					label="Check for updates automatically"
					htmlFor={autoUpdateSwitchId}
					control={
						<Switch
							id={autoUpdateSwitchId}
							checked={autoUpdateCheckingEnabled}
							disabled={!supportsAutoUpdates}
							onCheckedChange={(checked) =>
								void setAutoUpdateCheckingEnabled(checked)
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
							size="sm"
							variant="default"
							disabled={!supportsAutoUpdates || isCheckingForUpdates}
							onClick={() => void checkForUpdatesNow(supportsAutoUpdates)}
						>
							{isCheckingForUpdates ? "Checking…" : "Check for Updates…"}
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
								className={classes.keyInput}
								type="password"
								placeholder="API key"
								aria-label="Hardcover API key"
								value={apiKeyInput}
								onChange={(event) => setApiKeyInput(event.currentTarget.value)}
							/>
						}
					/>
					<div className={classes.row}>
						<div className={classes.rowActions}>
							<Button
								size="sm"
								variant="default"
								disabled={!apiKeyInput || isTesting}
								onClick={() => void handleClear()}
							>
								Clear
							</Button>
							<Button
								size="sm"
								variant="default"
								disabled={!apiKeyInput || isTesting}
								onClick={() => void handleTest()}
							>
								{isTesting ? "Testing…" : "Test Connection"}
							</Button>
							<Button
								size="sm"
								variant="primary"
								disabled={!apiKeyInput || isTesting}
								onClick={() => void handleSave()}
							>
								Save
							</Button>
						</div>
					</div>
				</div>
				{testResult && (
					<p
						className={classes.inlineNote}
						data-tone={testResult.success ? "ok" : "error"}
						role="status"
					>
						{testResult.message}
					</p>
				)}
			</div>
		</div>
	);
};
