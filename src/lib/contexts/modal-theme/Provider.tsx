import { ThemeModalContext } from "@/lib/contexts/modal-theme/context";
import { useDisclosure } from "@mantine/hooks";
import { PropsWithChildren } from "react";

export const ThemeModalProvider = ({ children }: PropsWithChildren) => {
	const [isThemeModalOpen, { open, close, toggle }] = useDisclosure(false);

	return (
		<ThemeModalContext.Provider
			value={[isThemeModalOpen, { open, close, toggle }]}
		>
			{children}
		</ThemeModalContext.Provider>
	);
};
