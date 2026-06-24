import { useMemo } from "react";
import { getDescriptor } from "@/lib/metadata-providers/registry";
import type {
	ProviderDescriptor,
	ProviderId,
	ResolvedProviderConfig,
} from "@/lib/metadata-providers/types";
import { useSettings } from "./store";

/**
 * Providers usable for a lookup right now: enabled, in preference order, and —
 * for key-requiring providers — actually configured with a key. This is what
 * makes "no Hardcover key -> library lookup still works" fall out structurally.
 */
export const useEnabledProviders = (): ProviderDescriptor[] => {
	const metadataProviders = useSettings((state) => state.metadataProviders);
	return useMemo(() => {
		return metadataProviders.preferenceOrder
			.filter((id) => metadataProviders.configs[id]?.enabled)
			.map((id) => getDescriptor(id))
			.filter((descriptor) => {
				if (!descriptor.capabilities.requiresKey) return true;
				const key = metadataProviders.configs[descriptor.id]?.apiKey ?? "";
				return key.trim().length > 0;
			});
	}, [metadataProviders]);
};

/** Whether any source is usable for a lookup (drives the Edit Book guard). */
export const useAnySourceEnabled = (): boolean =>
	useEnabledProviders().length > 0;

/** A stable resolver for a provider's runtime config (its key, if any). */
export const useResolvedProviderConfig = (): ((
	id: ProviderId,
) => ResolvedProviderConfig) => {
	const metadataProviders = useSettings((state) => state.metadataProviders);
	return useMemo(
		() => (id: ProviderId) => ({
			apiKey: metadataProviders.configs[id]?.apiKey ?? "",
		}),
		[metadataProviders],
	);
};

export const useAutoLookupOnImport = (): boolean =>
	useSettings((state) => state.metadataProviders.autoLookupOnImport);
