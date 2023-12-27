import { dialog } from "@tauri-apps/api";
import { commands } from "../../bindings";

export const addBook = async (libraryPath: string) => {
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
  const importableFile = await commands.checkFileImportable(filePath);
  const metadata = await commands.getImportableFileMetadata(importableFile);

  await commands.addBookToDbByMetadata(libraryPath, metadata);
};
