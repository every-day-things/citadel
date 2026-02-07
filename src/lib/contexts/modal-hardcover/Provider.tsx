import { HardcoverModalContext } from "@/lib/contexts/modal-hardcover/context";
import { useDisclosure } from "@mantine/hooks";
import { PropsWithChildren } from "react";

export const HardcoverModalProvider = ({ children }: PropsWithChildren) => {
	const [isHardcoverModalOpen, { open, close, toggle }] = useDisclosure(false);

	return (
		<HardcoverModalContext.Provider
			value={[isHardcoverModalOpen, { open, close, toggle }]}
		>
			{children}
		</HardcoverModalContext.Provider>
	);
};
