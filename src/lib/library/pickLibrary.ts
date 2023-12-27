import { open } from "@tauri-apps/api/dialog";
import { settings } from "../../stores/settings";

export const pickLibrary = async () => {
  const selected = await open({
    multiple: false,
    directory: true,
    recursive: true,
    title: "Select Calibre Library Folder",
  });

  if (typeof selected === "string") {
    await settings.set("calibreLibraryPath", selected);
  } else {
    console.log("no path selected", selected);
  }
};
