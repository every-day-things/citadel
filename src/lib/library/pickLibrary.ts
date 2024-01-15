import { open } from "@tauri-apps/api/dialog";
import { settings } from "../../stores/settings";
import { initLibrary, libraryClient } from "../../stores/library";
import { books } from "../../stores/books";

export const pickLibrary = async () => {
  const selected = await open({
    multiple: false,
    directory: true,
    recursive: true,
    title: "Select Calibre Library Folder",
  });

  if (typeof selected === "string") {
    await settings.set("calibreLibraryPath", selected);

    await initLibrary({ libraryType: "calibre", libraryPath: selected, connectionType: "local" });
    books.set(await libraryClient().listBooks());
  } else {
    console.log("no path selected", selected);
  }
};
