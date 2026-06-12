import type { KeyboardEvent, ReactNode } from "react";
import { useCallback, useId, useRef, useState } from "react";
import { commands } from "@/bindings";
import { F7BookFill } from "@/components/icons/F7BookFill";
import { F7Gear } from "@/components/icons/F7Gear";
import { FluentLibraryFilled } from "@/components/icons/FluentLibraryFilled";
import { SwitchLibraryForm } from "@/components/molecules/SwitchLibraryForm";
import classes from "@/components/organisms/SettingsPanes.module.css";
import {
	Button,
	SegmentedControl,
	Select,
	Switch,
	TextInput,
} from "@/components/ui";
import { useAppUpdates } from "@/lib/hooks/use-app-updates";
import { none, some } from "@/lib/option";
import { usePlatform } from "@/lib/platform/context";
import type { ThemePalette } from "@/lib/platform/settings/types";
import { applyColorScheme, applyThemePalette } from "@/lib/theme-manager";
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
 * Classic macOS preferences layout (iTerm2 / pre-Ventura System Preferences):
 * a centered icon-over-label tab strip across the top, a hairline divider,
 * then the active pane on the window chrome background. The window's native
 * title bar already says "Settings", so the pane renders no title of its own.
 */
export const SettingsPanes = ({ onRequestClose }: SettingsPanesProps) => {
	const [activeTab, setActiveTab] = useState<SettingsTab>("general");
	const tabRefs = useRef<
		Partial<Record<SettingsTab, HTMLButtonElement | null>>
	>({});
	const baseId = useId();

	const tabId = (tab: SettingsTab) => `${baseId}-tab-${tab}`;
	const panelId = (tab: SettingsTab) => `${baseId}-panel-${tab}`;

	const close = useCallback(() => {
		onRequestClose?.();
	}, [onRequestClose]);

	const selectAndFocusTab = useCallback((tab: SettingsTab) => {
		setActiveTab(tab);
		tabRefs.current[tab]?.focus();
	}, []);

	// Automatic activation: arrows move both focus and selection, macOS style.
	const handleTabKeyDown = useCallback(
		(event: KeyboardEvent<HTMLButtonElement>) => {
			const index = SETTINGS_TABS.indexOf(activeTab);
			let next: SettingsTab | undefined;
			switch (event.key) {
				case "ArrowRight":
					next = SETTINGS_TABS[(index + 1) % SETTINGS_TABS.length];
					break;
				case "ArrowLeft":
					next =
						SETTINGS_TABS[
							(index - 1 + SETTINGS_TABS.length) % SETTINGS_TABS.length
						];
					break;
				case "Home":
					next = SETTINGS_TABS[0];
					break;
				case "End":
					next = SETTINGS_TABS[SETTINGS_TABS.length - 1];
					break;
				default:
					return;
			}
			event.preventDefault();
			if (next) selectAndFocusTab(next);
		},
		[activeTab, selectAndFocusTab],
	);

	return (
		<div className={classes.pane}>
			<div
				role="tablist"
				aria-label="Settings sections"
				className={classes.tabStrip}
			>
				{SETTINGS_TABS.map((tab) => (
					<button
						key={tab}
						ref={(node) => {
							tabRefs.current[tab] = node;
						}}
						type="button"
						role="tab"
						id={tabId(tab)}
						aria-selected={tab === activeTab}
						aria-controls={panelId(tab)}
						tabIndex={tab === activeTab ? 0 : -1}
						className={classes.tab}
						onClick={() => setActiveTab(tab)}
						onKeyDown={handleTabKeyDown}
					>
						<span className={classes.tabIcon} aria-hidden="true">
							{TAB_META[tab].icon(classes.tabIconGlyph)}
						</span>
						<span className={classes.tabLabel}>{TAB_META[tab].label}</span>
					</button>
				))}
			</div>
			<div
				role="tabpanel"
				id={panelId(activeTab)}
				aria-labelledby={tabId(activeTab)}
				className={classes.panel}
			>
				<div className={classes.panelInner}>
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

const PALETTE_OPTIONS: { value: ThemePalette; label: string }[] = [
	{ value: "marble", label: "Marble" },
	{ value: "signal", label: "Signal" },
];

const GeneralTab = () => {
	const theme = useSettings((state) => state.theme);
	const setTheme = useSettings((state) => state.setTheme);
	const themePalette = useSettings((state) => state.themePalette);
	const setThemePalette = useSettings((state) => state.setThemePalette);
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
				<SettingsRow
					label="Theme"
					description="Each restyles the whole app: color, shape, and type."
					control={
						<Select
							aria-label="Theme"
							width={140}
							value={themePalette}
							options={PALETTE_OPTIONS}
							onChange={(value) => {
								const palette = value as ThemePalette;
								applyThemePalette(palette);
								void setThemePalette(palette);
							}}
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
