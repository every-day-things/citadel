import { SwitchLibraryForm } from "../molecules/SwitchLibraryForm";
import {
	LibraryPath,
	createSettingsLibrary,
	setActiveLibrary,
	settings,
} from "@/stores/settings";
import { pickLibrary } from "@/lib/services/library";
import { Modal } from "@mantine/core";
import { useCallback, useEffect, useState } from "react";
import { useLibrarySelectModal } from "@/lib/contexts/modal-library-select/hooks";
import { useSettings } from "@/lib/contexts/settings";
import { commands } from "@/bindings";

export const LibrarySelectModal = () => {
	const { close, isOpen: isSwitchLibraryModalOpen } = useLibrarySelectModal();
	const { set, subscribe } = useSettings();
	const [libraries, setLibraries] = useState<LibraryPath[]>([]);
	const [activeLibraryId, setActiveLibraryId] = useState<string | null>(null);

	useEffect(() => {
		return subscribe((update) => {
			if (!update) return; // Safety check for undefined update
			setLibraries(update.libraryPaths || []);
			const activeLibrary = update.libraryPaths?.find(
				(library) => library.id === update.activeLibraryId,
			);
			if (activeLibrary) {
				setActiveLibraryId(activeLibrary.id);
			}
		});
	}, [subscribe]);

	const addNewLibraryByPath = useCallback(
		async (form: SwitchLibraryForm) => {
			const isPathValidLibrary = await commands.clbQueryIsPathValidLibrary(
				form.libraryPath,
			);

			if (isPathValidLibrary) {
				const newLibraryId = await createSettingsLibrary(
					settings,
					form.libraryPath,
				);
				await setActiveLibrary(settings, newLibraryId);
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
			await set("activeLibraryId", id);
			close();
		},
		[close, set],
	);

	console.log({
		isSwitchLibraryModalOpen,
		activeLibraryId,
		libraries,
	});

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
