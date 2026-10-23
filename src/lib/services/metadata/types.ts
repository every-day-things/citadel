import type { BookMetadata, MetadataProvider } from "@/bindings";
export interface MetadataService {
	search(
		provider: MetadataProvider,
		query: string,
		apiKey: string,
	): Promise<BookMetadata[]>;
	byIsbn(
		provider: MetadataProvider,
		isbn: string,
		apiKey: string,
	): Promise<BookMetadata[]>;
	test(
		provider: MetadataProvider,
		apiKey: string,
	): Promise<{ ok: boolean; message: string }>;
}
