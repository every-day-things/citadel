import { useHardcoverModal } from "@/lib/contexts/modal-hardcover/hooks";
import { useSettings } from "@/stores/settings/store";
import {
	Modal,
	Stack,
	TextInput,
	Button,
	Group,
	Text,
	Alert,
} from "@mantine/core";
import { useState, useCallback } from "react";
import { commands } from "@/bindings";

export const HardcoverSettingsModal = () => {
	const [isHardcoverModalOpen, { close: closeHardcoverModal }] =
		useHardcoverModal();
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
				setTestResult({
					success: false,
					message: result.error,
				});
			}
		} catch (error) {
			setTestResult({
				success: false,
				message: `Error: ${error}`,
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
		<HardcoverSettingsModalPure
			isOpen={isHardcoverModalOpen}
			onClose={closeHardcoverModal}
			apiKeyInput={apiKeyInput}
			onApiKeyInputChange={setApiKeyInput}
			onSave={handleSave}
			onTest={handleTest}
			onClear={handleClear}
			isTesting={isTesting}
			testResult={testResult}
		/>
	);
};

interface HardcoverSettingsModalPureProps {
	isOpen: boolean;
	onClose: () => void;
	apiKeyInput: string;
	onApiKeyInputChange: (value: string) => void;
	onSave: () => void;
	onTest: () => void;
	onClear: () => void;
	isTesting: boolean;
	testResult: { success: boolean; message: string } | null;
}

const HardcoverSettingsModalPure = ({
	isOpen,
	onClose,
	apiKeyInput,
	onApiKeyInputChange,
	onSave,
	onTest,
	onClear,
	isTesting,
	testResult,
}: HardcoverSettingsModalPureProps) => {
	return (
		<Modal
			opened={isOpen}
			onClose={onClose}
			overlayProps={{
				backgroundOpacity: 0,
			}}
			title="Hardcover API Settings"
		>
			<Stack gap="md">
				<Text size="sm" c="dimmed">
					Enter your Hardcover API key to enable integration. You can find your
					API key in your Hardcover account settings.
				</Text>

				<TextInput
					label="API Key"
					placeholder="Enter your Hardcover API key"
					value={apiKeyInput}
					onChange={(e) => onApiKeyInputChange(e.currentTarget.value)}
					type="password"
				/>

				{testResult && (
					<Alert
						color={testResult.success ? "green" : "red"}
						title={testResult.success ? "Success" : "Error"}
					>
						{testResult.message}
					</Alert>
				)}

				<Group justify="space-between">
					<Button
						variant="subtle"
						color="red"
						onClick={onClear}
						disabled={!apiKeyInput}
					>
						Clear
					</Button>

					<Group>
						<Button
							variant="default"
							onClick={onTest}
							loading={isTesting}
							disabled={!apiKeyInput}
						>
							Test Connection
						</Button>
						<Button onClick={onSave} disabled={!apiKeyInput}>
							Save
						</Button>
					</Group>
				</Group>
			</Stack>
		</Modal>
	);
};
