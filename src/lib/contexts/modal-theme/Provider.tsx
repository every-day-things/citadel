import { ThemeModalOpenContext } from "@/lib/contexts/modal-theme/context";
import { useDisclosure } from "@mantine/hooks";
import { PropsWithChildren } from "react";

export const ThemeModalProvider = ({ children }: PropsWithChildren) => {
	const [isThemeModalOpen, { open, close, toggle }] = useDisclosure(false);

	return (
		<ThemeModalOpenContext.Provider
			value={[isThemeModalOpen, { open, close, toggle }]}
		>
			{children}
		</ThemeModalOpenContext.Provider>
	);
};
