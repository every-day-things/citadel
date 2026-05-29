import { SwitchLibraryForm } from "../molecules/SwitchLibraryForm";
import { useSettings } from "@/stores/settings/store";
import { createLibrary, setActiveLibrary } from "@/stores/settings/actions";
import { usePlatform } from "@/lib/platform/context";
import { none, some } from "@/lib/option";
import { Modal } from "@mantine/core";
import { useCallback } from "react";
import { useLibrarySelectModal } from "@/lib/contexts/modal-library-select/hooks";
import { commands } from "@/bindings";

export const LibrarySelectModal = () => {
	const { close, isOpen: isSwitchLibraryModalOpen } = useLibrarySelectModal();
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
				close();
			} else {
				// TODO: You could create a new library, if you like.
				console.error("Invalid library path selected");
			}
		},
		[close],
	);

	const selectExistingLibrary = useCallback(
		async (id: string) => {
			await setActiveLibrary(id);
			close();
		},
		[close],
	);

	if (!activeLibraryId) {
		return <p>Something went wrong</p>;
	}

	return (
		<SwitchLibraryPathModalPure
			isOpen={isSwitchLibraryModalOpen}
			onClose={close}
		>
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
		</SwitchLibraryPathModalPure>
	);
};

interface SwitchLibraryPathModalPureProps {
	isOpen: boolean;
	onClose: () => void;
	children: React.ReactNode;
}

const SwitchLibraryPathModalPure = ({
	isOpen,
	onClose,
	children,
}: SwitchLibraryPathModalPureProps) => {
	return (
		<Modal.Root opened={isOpen} onClose={onClose} size={"lg"}>
			<Modal.Overlay blur={3} backgroundOpacity={0.35} />
			<Modal.Content
				style={{
					background: "var(--ctd-drawer-gradient)",
					border: "1px solid var(--ctd-border)",
				}}
			>
				<Modal.Header
					style={{
						backgroundColor: "transparent",
						borderBottom: "1px solid var(--ctd-border)",
					}}
				>
					<Modal.Title>Switch library</Modal.Title>
					<Modal.CloseButton
						style={{
							border: "1px solid var(--ctd-border)",
							backgroundColor: "var(--ctd-control-bg)",
						}}
					/>
				</Modal.Header>
				<Modal.Body
					style={{
						paddingTop: "0.9rem",
					}}
				>
					{children}
				</Modal.Body>
			</Modal.Content>
		</Modal.Root>
	);
};
