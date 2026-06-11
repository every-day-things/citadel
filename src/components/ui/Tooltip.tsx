import * as RadixTooltip from "@radix-ui/react-tooltip";
import type { ReactElement } from "react";
import styles from "./Tooltip.module.css";

export interface TooltipProps {
	label: string;
	children: ReactElement;
	openDelay?: number;
}

export const Tooltip = ({ label, children, openDelay = 500 }: TooltipProps) => (
	<RadixTooltip.Provider delayDuration={openDelay} skipDelayDuration={300}>
		<RadixTooltip.Root>
			{/* asChild: children must forward their ref to a DOM element. */}
			<RadixTooltip.Trigger asChild>{children}</RadixTooltip.Trigger>
			<RadixTooltip.Portal>
				<RadixTooltip.Content
					className={styles.content}
					side="bottom"
					sideOffset={6}
				>
					{label}
				</RadixTooltip.Content>
			</RadixTooltip.Portal>
		</RadixTooltip.Root>
	</RadixTooltip.Provider>
);
