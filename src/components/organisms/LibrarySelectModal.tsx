import { SwitchLibraryForm } from "../molecules/SwitchLibraryForm";
import {
	useSettings,
} from "@/stores/settings/store";
import { createLibrary, setActiveLibrary } from "@/stores/settings/actions";
import { pickLibrary } from "@/lib/services/library";
import { Modal } from "@mantine/core";
import { useCallback } from "react";
import { useLibrarySelectModal } from "@/lib/contexts/modal-library-select/hooks";
import { commands } from "@/bindings";

export const LibrarySelectModal = () => {
	const { close, isOpen: isSwitchLibraryModalOpen } = useLibrarySelectModal();
	const libraries = useSettings((state) => state.libraryPaths);
	const activeLibraryId = useSettings((state) => state.activeLibraryId);

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
				selectNewLibrary={pickLibrary}
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
			<Modal.Content>
				<Modal.Header>
					<Modal.Title>Switch library</Modal.Title>
					<Modal.CloseButton />
				</Modal.Header>
				<Modal.Body>{children}</Modal.Body>
			</Modal.Content>
		</Modal.Root>
	);
};
