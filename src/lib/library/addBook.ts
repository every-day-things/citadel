import { dialog } from "@tauri-apps/api";
import type { Library } from "./typesLibrary";

export const addBook = async (library: Library) => {
  let filePath = await dialog.open({
    multiple: false,
    directory: false,
    filters: [
      {
        name: "EPUB",
        extensions: ["epub"],
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
  await library.addImportableFileByMetadata(metadata);
};
