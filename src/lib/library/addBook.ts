import { dialog } from "@tauri-apps/api";
import type { Library } from "./_types";
import type { ImportableBookMetadata } from "../../bindings";

export const promptToAddBook = async (library: Library): Promise<ImportableBookMetadata | void> => {
  let validExtensions = (await library.listValidFileTypes()).map((type) => type.extension);
  let filePath = await dialog.open({
    multiple: false,
    directory: false,
    filters: [
      {
        name: "Importable files",
        extensions: validExtensions,
      },
    ],
  });
  if (!filePath) {
    return;
  }
  if (typeof filePath === "object") {
    filePath = filePath[0];
  }
  const importableFile = await library.checkFileImportable(filePath);
  if (!importableFile) {
    return;
  }
  const metadata = await library.getImportableFileMetadata(importableFile);
  if (!metadata) {
    return;
  }

  return metadata;
}

export const commitAddBook = async (library: Library, metadata: ImportableBookMetadata) => {
  await library.addImportableFileByMetadata(metadata);
};
