import { LibrarySelectModalContext } from "@/lib/contexts/modal-library-select/context";
import { useDisclosure } from "@mantine/hooks";

export const LibrarySelectModalProvider = ({
	children,
}: React.PropsWithChildren) => {
	const [isOpen, { close, open }] = useDisclosure(false);

	return (
		<LibrarySelectModalContext.Provider
			value={{
				open,
				close,
				isOpen,
			}}
		>
			{children}
		</LibrarySelectModalContext.Provider>
	);
};
