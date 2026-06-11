import * as RadixTooltip from "@radix-ui/react-tooltip";
import type { ReactElement, ReactNode } from "react";
import styles from "./Tooltip.module.css";

export interface TooltipProviderProps {
	children: ReactNode;
}

/**
 * App-level provider (mounted once in App.tsx). Sharing one provider lets
 * skipDelayDuration work: moving between adjacent toolbar controls shows
 * their tooltips without re-waiting the full open delay.
 */
export const TooltipProvider = ({ children }: TooltipProviderProps) => (
	<RadixTooltip.Provider delayDuration={500} skipDelayDuration={300}>
		{children}
	</RadixTooltip.Provider>
);

export interface TooltipProps {
	label: string;
	children: ReactElement;
	openDelay?: number;
}

export const Tooltip = ({ label, children, openDelay = 500 }: TooltipProps) => (
	<RadixTooltip.Root delayDuration={openDelay}>
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
);
